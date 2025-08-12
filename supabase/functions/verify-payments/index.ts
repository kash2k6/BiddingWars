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
    console.log('🕐 Supabase Edge Function: Verifying payments and checking refunds')
    console.log('🚀 Function started successfully')
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('✅ Supabase client created')

    // Find all barracks items that need verification (PENDING_PAYMENT or PAID)
    const { data: allItems, error: fetchError } = await supabase
      .from('barracks_items')
      .select(`
        *,
        auction:auction_id(*)
      `)
      .in('status', ['PENDING_PAYMENT', 'PAID'])

    if (fetchError) {
      console.error('Error fetching barracks items:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch barracks items' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!allItems || allItems.length === 0) {
      console.log('No barracks items to verify')
      return new Response(
        JSON.stringify({ message: 'No barracks items to verify', verified: 0, refunded: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${allItems.length} barracks items to verify`)
    allItems.forEach(item => {
      console.log(`  - Item ${item.id}: status=${item.status}, plan_id=${item.plan_id}`)
    })

    let verifiedCount = 0
    let refundedCount = 0
    const errors: string[] = []

    for (const item of allItems) {
      try {
        console.log(`\n🔍 Processing item ${item.id} (status: ${item.status})`)
        
        // Use Whop V5 API to check payment status by plan ID
        try {
          console.log(`🔍 Checking payment status for plan: ${item.plan_id}`)
          
          // Step 1: List payments for this plan ID
          const listResponse = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${item.plan_id}&in_app_payments=true`, {
            headers: {
              'Authorization': `Bearer ${Deno.env.get('WHOP_API_KEY')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!listResponse.ok) {
            console.error(`Failed to list payments for plan ${item.plan_id}: ${listResponse.status}`)
            continue
          }

          const listData = await listResponse.json()
          console.log(`Found ${listData.data?.length || 0} payments for plan ${item.plan_id}`)

          // Step 2: Check payment status - find the specific payment for this item
          let specificPayment = null
          let successfulPayment = null
          
          console.log('🔍 Analyzing payments:')
          for (const payment of listData.data || []) {
            console.log(`  Payment ${payment.id}: status=${payment.status}, paid_at=${payment.paid_at}, refunded_at=${payment.refunded_at}`)
            
            if (payment.status === 'paid' && payment.paid_at) {
              // Find the most recent payment for this plan
              if (!specificPayment || payment.paid_at > specificPayment.paid_at) {
                specificPayment = payment
                console.log(`    -> Set as specific payment (most recent)`)
              }
              
              if (!payment.refunded_at) {
                // This payment is successful and not refunded
                successfulPayment = payment
                console.log(`    -> Set as successful payment`)
              }
            }
          }
          
          console.log(`Final result: specificPayment=${specificPayment?.id || 'null'}, successfulPayment=${successfulPayment?.id || 'null'}`)

          // Handle the specific payment for this barracks item
          if (specificPayment) {
            console.log(`Processing specific payment: ${specificPayment.id}, refunded: ${!!specificPayment.refunded_at}`)
            
            if (specificPayment.refunded_at) {
              console.log(`❌ Specific payment was refunded: ${specificPayment.id}`)
              
              // Update barracks item status to REFUNDED
              console.log(`🔄 Updating barracks item ${item.id} to REFUNDED...`)
              const { error: updateError } = await supabase
                .from('barracks_items')
                .update({
                  status: 'REFUNDED',
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id)

              if (updateError) {
                console.error(`Error updating barracks item ${item.id} to REFUNDED:`, updateError)
                errors.push(`Failed to update barracks item ${item.id} to REFUNDED`)
                continue
              } else {
                console.log(`✅ Successfully updated barracks item ${item.id} to REFUNDED`)
              }

              // Update auction status to REFUNDED
              console.log(`🔄 Updating auction ${item.auction_id} to REFUNDED...`)
              const { error: auctionError } = await supabase
                .from('auctions')
                .update({
                  status: 'REFUNDED',
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.auction_id)

              if (auctionError) {
                console.error(`Error updating auction ${item.auction_id} to REFUNDED:`, auctionError)
                errors.push(`Failed to update auction ${item.auction_id} to REFUNDED`)
                continue
              } else {
                console.log(`✅ Successfully updated auction ${item.auction_id} to REFUNDED`)
              }

              // Remove winning bid record if it exists
              console.log(`🔄 Removing winning bid for auction ${item.auction_id}...`)
              const { error: deleteWinningBidError } = await supabase
                .from('winning_bids')
                .delete()
                .eq('auction_id', item.auction_id)

              if (deleteWinningBidError) {
                console.error(`Error deleting winning bid for auction ${item.auction_id}:`, deleteWinningBidError)
                // Don't add to errors as this is not critical
              } else {
                console.log(`✅ Successfully removed winning bid for auction ${item.auction_id}`)
              }

              console.log(`❌ Payment refunded for item ${item.id} - Access removed`)
              refundedCount++
              continue
            } else if (item.status === 'PENDING_PAYMENT') {
              // Payment is successful and not refunded, and item is pending
              console.log(`✅ Found successful payment: ${specificPayment.id}`)
              
              // Update barracks item status
              const { error: updateError } = await supabase
                .from('barracks_items')
                .update({
                  status: 'PAID',
                  paid_at: new Date(specificPayment.paid_at * 1000).toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id)

              if (updateError) {
                console.error(`Error updating barracks item ${item.id}:`, updateError)
                errors.push(`Failed to update barracks item ${item.id}`)
                continue
              }

              // Update auction status
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
                  bid_id: item.auction?.current_bid_id,
                  amount_cents: item.amount_cents,
                  payment_processed: true,
                  payment_id: specificPayment.id
                })
                .single()

              if (winningBidError) {
                console.error(`Error creating winning bid for auction ${item.auction_id}:`, winningBidError)
                errors.push(`Failed to create winning bid for auction ${item.auction_id}`)
                continue
              }

              console.log(`✅ Payment verified for item ${item.id} - Item now accessible in barracks`)
              verifiedCount++
            } else {
              console.log(`Item ${item.id} is already PAID and payment is not refunded - no action needed`)
            }
          } else if (item.status === 'PENDING_PAYMENT') {
            console.log(`⏳ No successful payment found for plan ${item.plan_id}`)
          }

        } catch (paymentError) {
          console.error(`Error checking payment status for plan ${item.plan_id}:`, paymentError)
          errors.push(`Failed to check payment status for plan ${item.plan_id}`)
        }

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        errors.push(`Failed to process item ${item.id}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Payment verification and refund check completed',
        verified: verifiedCount,
        refunded: refundedCount,
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
