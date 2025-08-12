import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { WhopServerSdk } from '@whop/api'

export async function POST(request: NextRequest) {
  try {
    console.log('Cron job: Verifying pending payments')
    
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all barracks items with PENDING_PAYMENT status
    const { data: pendingItems, error: fetchError } = await supabaseServer
      .from('barracks_items')
      .select(`
        *,
        auction:auction_id(*)
      `)
      .eq('status', 'PENDING_PAYMENT')

    if (fetchError) {
      console.error('Error fetching pending items:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending items' }, { status: 500 })
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('No pending payments to verify')
      return NextResponse.json({ message: 'No pending payments to verify', verified: 0 })
    }

    console.log(`Found ${pendingItems.length} pending payments to verify`)

    let verifiedCount = 0
    const errors: string[] = []

    for (const item of pendingItems) {
      try {
        // Create Whop SDK instance
        const whopSdk = WhopServerSdk({
          appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
          appApiKey: process.env.WHOP_API_KEY!
        })

        // Use Whop V5 API to check the actual payment status
        try {
          // Check if we have a plan_id (new flow) or payment_id (old flow)
          if (item.plan_id && !item.plan_id.startsWith('temp_plan_')) {
            // New flow: Check payments for this plan
            const paymentResponse = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${item.plan_id}&in_app_payments=true`, {
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json'
              }
            })

          if (!paymentResponse.ok) {
            console.error(`Failed to fetch payments for plan ${item.plan_id}: ${paymentResponse.status}`)
            continue
          }

          const paymentsData = await paymentResponse.json()
          console.log(`Payments for plan ${item.plan_id}:`, JSON.stringify(paymentsData, null, 2))

          // Check if we have any paid payments for this plan
          if (paymentsData.data && paymentsData.data.length > 0) {
            // Filter payments to only include payments for THIS specific plan
            const planPayments = paymentsData.data.filter(payment => payment.plan_id === item.plan_id)
            
            if (planPayments.length === 0) {
              console.log(`No payments found for plan ${item.plan_id} - keeping as pending`)
              continue
            }
            
            const payment = planPayments[0] // Get the first payment for this plan
            console.log(`Payment status for plan ${item.plan_id}: ${payment.status}`)
            
            // Check if payment is successful (API returns "paid" not "succeeded")
            // Also check if it's not refunded
            if (payment.status === 'paid' && payment.paid_at && !payment.refunded_at) {
            // Payment confirmed - update barracks item status
            const { error: updateError } = await supabaseServer
              .from('barracks_items')
              .update({
                status: 'PAID',
                paid_at: new Date(paymentData.paid_at * 1000).toISOString(), // Convert timestamp to ISO
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (updateError) {
              console.error(`Error updating barracks item ${item.id}:`, updateError)
              errors.push(`Failed to update barracks item ${item.id}`)
              continue
            }

            // Update auction status to PAID
            const { error: auctionError } = await supabaseServer
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
            const { error: winningBidError } = await supabaseServer
              .from('winning_bids')
              .insert({
                auction_id: item.auction_id,
                user_id: item.user_id,
                bid_id: item.auction?.current_bid_id,
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

          } else if (payment.status === 'failed' || payment.status === 'canceled' || payment.refunded_at) {
            // Payment failed - remove from barracks and reset auction
            const { error: deleteError } = await supabaseServer
              .from('barracks_items')
              .delete()
              .eq('id', item.id)

            if (deleteError) {
              console.error(`Error removing failed barracks item ${item.id}:`, deleteError)
              errors.push(`Failed to remove failed barracks item ${item.id}`)
              continue
            }

            // Reset auction status back to ENDED so it can be relisted
            const { error: resetError } = await supabaseServer
              .from('auctions')
              .update({
                status: 'ENDED',
                winner_user_id: null,
                current_bid_id: null,
                payment_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.auction_id)

            if (resetError) {
              console.error(`Error resetting auction ${item.auction_id}:`, resetError)
              errors.push(`Failed to reset auction ${item.auction_id}`)
              continue
            }

            const reason = payment.refunded_at ? 'refunded' : payment.status
            console.log(`Payment ${reason} for item ${item.id} - Item removed from barracks, auction reset`)
            verifiedCount++

          } else {
            // Payment is still pending (draft, processing, etc.)
            console.log(`Payment for plan ${item.plan_id} is still pending with status: ${payment.status}`)
          }
        } else {
          // No payments found for this plan - mark as pending
          console.log(`No payments found for plan ${item.plan_id} - keeping as pending`)
        }

        } catch (paymentError) {
          console.error(`Error checking payment status for plan ${item.plan_id}:`, paymentError)
          errors.push(`Failed to check payment status for plan ${item.plan_id}`)
        }
      } else if (item.payment_id) {
        // Old flow: Check payment by payment_id
        try {
          const paymentResponse = await fetch(`https://api.whop.com/v5/app/payments/${item.payment_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })

          if (!paymentResponse.ok) {
            console.error(`Failed to fetch payment ${item.payment_id}: ${paymentResponse.status}`)
            continue
          }

          const paymentData = await paymentResponse.json()
          console.log(`Payment status for ${item.payment_id}: ${paymentData.status}`)

          if (paymentData.status === 'paid' && paymentData.paid_at && !paymentData.refunded_at) {
            // Payment confirmed - update barracks item status
            const { error: updateError } = await supabaseServer
              .from('barracks_items')
              .update({
                status: 'PAID',
                paid_at: new Date(paymentData.paid_at * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (updateError) {
              console.error(`Error updating barracks item ${item.id}:`, updateError)
              errors.push(`Failed to update barracks item ${item.id}`)
              continue
            }

            console.log(`Payment verified for item ${item.id} - Item now accessible in barracks`)
            verifiedCount++
          } else {
            console.log(`Payment ${item.payment_id} is still pending with status: ${paymentData.status}`)
          }
        } catch (paymentError) {
          console.error(`Error checking payment status for ${item.payment_id}:`, paymentError)
          errors.push(`Failed to check payment status for ${item.payment_id}`)
        }
      } else {
        console.log(`Item ${item.id} has no plan_id or payment_id - skipping`)
      }

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        errors.push(`Failed to process item ${item.id}`)
      }
    }

    return NextResponse.json({
      message: 'Payment verification completed',
      verified: verifiedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in payment verification cron job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
