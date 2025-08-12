import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 Supabase Edge Function: Finalizing ended auctions')
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find all LIVE auctions that have ended
    const { data: endedAuctions, error: fetchError } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'LIVE')
      .lt('ends_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching ended auctions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch auctions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!endedAuctions || endedAuctions.length === 0) {
      console.log('No auctions to finalize')
      return new Response(
        JSON.stringify({ message: 'No auctions to finalize', finalized: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${endedAuctions.length} auctions to finalize`)

    let finalizedCount = 0
    const errors: string[] = []

    for (const auction of endedAuctions) {
      try {
        // Get the highest bid for this auction
        const { data: topBid, error: bidError } = await supabase
          .from('bids')
          .select('*')
          .eq('auction_id', auction.id)
          .order('amount_cents', { ascending: false })
          .limit(1)
          .single()

        if (bidError || !topBid) {
          // No bids, mark as ENDED
          const { error: updateError } = await supabase
            .from('auctions')
            .update({
              status: 'ENDED',
              updated_at: new Date().toISOString()
            })
            .eq('id', auction.id)

          if (updateError) {
            console.error(`Error updating auction ${auction.id}:`, updateError)
            errors.push(`Failed to update auction ${auction.id}`)
          } else {
            console.log(`Auction ${auction.id} ended with no bids`)
            finalizedCount++
          }
          continue
        }

        // For Supabase Edge Functions, we'll mark as PENDING_PAYMENT
        // The actual payment will be handled by the frontend when the user visits
        const { error: updateError } = await supabase
          .from('auctions')
          .update({
            status: 'PENDING_PAYMENT',
            winner_user_id: topBid.bidder_user_id,
            current_bid_id: topBid.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', auction.id)

        if (updateError) {
          console.error(`Error updating auction ${auction.id}:`, updateError)
          errors.push(`Failed to update auction ${auction.id}`)
          continue
        }

        // Automatically create barracks item for the winner
        const { error: barracksError } = await supabase
          .from('barracks_items')
          .insert({
            user_id: topBid.bidder_user_id,
            auction_id: auction.id,
            plan_id: `plan_${auction.id}`, // Generate a plan ID based on auction ID
            amount_cents: topBid.amount_cents,
            status: 'PENDING_PAYMENT',
            paid_at: null
          })

        if (barracksError) {
          console.error(`Error creating barracks item for auction ${auction.id}:`, barracksError)
          errors.push(`Failed to create barracks item for auction ${auction.id}`)
        } else {
          console.log(`Created barracks item for auction ${auction.id}`)
        }

        // Also create winning_bids entry
        const { error: winningBidError } = await supabase
          .from('winning_bids')
          .insert({
            auction_id: auction.id,
            user_id: topBid.bidder_user_id,
            bid_id: topBid.id,
            amount_cents: topBid.amount_cents,
            payment_processed: false
          })

        if (winningBidError) {
          console.error(`Error creating winning bid for auction ${auction.id}:`, winningBidError)
          errors.push(`Failed to create winning bid for auction ${auction.id}`)
        } else {
          console.log(`Created winning bid entry for auction ${auction.id}`)
        }

        console.log(`Auction ${auction.id} finalized with winner ${topBid.bidder_user_id}`)
        finalizedCount++

      } catch (error) {
        console.error(`Error processing auction ${auction.id}:`, error)
        errors.push(`Failed to process auction ${auction.id}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Auction finalization completed',
        finalized: finalizedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auction finalization:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
