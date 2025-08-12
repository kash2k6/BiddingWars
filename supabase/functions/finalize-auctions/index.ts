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
    console.log('🚀 Function started successfully')
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('✅ Supabase client created')

    // Find all auctions that have ended but haven't been finalized
    const { data: endedAuctions, error: fetchError } = await supabase
      .from('auctions')
      .select(`
        *,
        bids!inner(
          id,
          bidder_user_id,
          amount_cents,
          created_at
        )
      `)
      .eq('status', 'LIVE')
      .lt('ends_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching ended auctions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ended auctions' }), 
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
        console.log(`\n🔍 Processing auction ${auction.id}: ${auction.title}`)
        
        // Get the highest bid for this auction
        const bids = auction.bids || []
        if (bids.length === 0) {
          console.log(`No bids for auction ${auction.id}, marking as ENDED`)
          
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

        // Find the highest bid
        const topBid = bids.reduce((highest, current) => {
          if (current.amount_cents > highest.amount_cents) {
            return current
          } else if (current.amount_cents === highest.amount_cents) {
            // If same amount, take the earliest bid
            return new Date(current.created_at) < new Date(highest.created_at) ? current : highest
          }
          return highest
        })

        console.log(`Top bid: ${topBid.amount_cents} cents by ${topBid.bidder_user_id}`)

        // Create a Whop charge for the winner
        console.log(`Creating Whop charge for auction ${auction.id}`)
        
        const chargeData = {
          amount: topBid.amount_cents,
          currency: 'usd',
          metadata: {
            auctionId: auction.id,
            auctionTitle: auction.title,
            bidderUserId: topBid.bidder_user_id,
            bidId: topBid.id
          },
          description: `Payment for auction: ${auction.title}`,
          success_url: `${Deno.env.get('NEXT_PUBLIC_APP_URL')}/experiences/${auction.experience_id}/barracks?payment_success=true`,
          cancel_url: `${Deno.env.get('NEXT_PUBLIC_APP_URL')}/experiences/${auction.experience_id}/barracks?payment_cancelled=true`
        }

        const chargeResponse = await fetch('https://api.whop.com/v2/charges', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('WHOP_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chargeData)
        })

        if (!chargeResponse.ok) {
          console.error(`Failed to create charge for auction ${auction.id}:`, chargeResponse.status)
          errors.push(`Failed to create charge for auction ${auction.id}`)
          continue
        }

        const chargeResult = await chargeResponse.json()
        console.log(`Created charge: ${chargeResult.id}`)

        // Update auction status to PENDING_PAYMENT
        const { error: updateError } = await supabase
          .from('auctions')
          .update({
            status: 'PENDING_PAYMENT',
            winner_user_id: topBid.bidder_user_id,
            current_bid_id: topBid.id,
            payment_id: chargeResult.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', auction.id)

        if (updateError) {
          console.error(`Error updating auction ${auction.id}:`, updateError)
          errors.push(`Failed to update auction ${auction.id}`)
          continue
        }

        // Create barracks item with the real payment ID
        const { error: barracksError } = await supabase
          .from('barracks_items')
          .insert({
            user_id: topBid.bidder_user_id,
            auction_id: auction.id,
            payment_id: chargeResult.id, // Use the real Whop charge ID
            plan_id: chargeResult.plan_id || `plan_${auction.id}`, // Use plan_id from charge if available
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

        // Create winning_bids entry
        const { error: winningBidError } = await supabase
          .from('winning_bids')
          .insert({
            auction_id: auction.id,
            user_id: topBid.bidder_user_id,
            bid_id: topBid.id,
            amount_cents: topBid.amount_cents,
            payment_processed: false,
            payment_id: chargeResult.id
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
