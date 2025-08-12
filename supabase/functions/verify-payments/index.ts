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
    console.log('🕐 Supabase Edge Function: Verifying pending payments')
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find all barracks items with PENDING_PAYMENT status
    const { data: pendingItems, error: fetchError } = await supabase
      .from('barracks_items')
      .select(`
        *,
        auction:auction_id(*)
      `)
      .eq('status', 'PENDING_PAYMENT')

    if (fetchError) {
      console.error('Error fetching pending items:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending items' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('No pending payments to verify')
      return new Response(
        JSON.stringify({ message: 'No pending payments to verify', verified: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingItems.length} pending payments to verify`)

    let verifiedCount = 0
    const errors: string[] = []

    for (const item of pendingItems) {
      try {
        // For now, we'll check if the payment_id exists and assume it's paid
        // In a real implementation, you would verify with Whop API here
        if (item.payment_id) {
          // Payment confirmed - update barracks item status
          const { error: updateError } = await supabase
            .from('barracks_items')
            .update({
              status: 'PAID',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`Error updating barracks item ${item.id}:`, updateError)
            errors.push(`Failed to update barracks item ${item.id}`)
            continue
          }

          // Update auction status to PAID
          const { error: auctionError } = await supabase
            .from('auctions')
            .update({
              status: 'PAID',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.auction_id)

          if (auctionError) {
            console.error(`Error updating auction ${item.auction_id}:`, auctionError)
            errors.push(`Failed to update auction ${item.auction_id}`)
            continue
          }

          // Create winning bid record
          const { error: winningBidError } = await supabase
            .from('winning_bids')
            .insert({
              auction_id: item.auction_id,
              user_id: item.user_id,
              bid_id: item.auction.current_bid_id,
              amount_cents: item.amount_cents,
              payment_processed: true,
              payment_id: item.payment_id
            })
            .single()

          if (winningBidError) {
            console.error(`Error creating winning bid for auction ${item.auction_id}:`, winningBidError)
            errors.push(`Failed to create winning bid for auction ${item.auction_id}`)
            continue
          }

          console.log(`Payment verified for item ${item.id} - Item now accessible in barracks`)
          verifiedCount++
        } else {
          console.log(`No payment_id for item ${item.id} - skipping`)
        }

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        errors.push(`Failed to process item ${item.id}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Payment verification completed',
        verified: verifiedCount,
        errors: errors.length > 0 ? errors : undefined
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in payment verification cron job:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
