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
      .not('plan_id', 'is', null) // Only process items with plan_id

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

        // Check if we have a plan_id (new flow) or payment_id (old flow)
        if (item.plan_id && !item.plan_id.startsWith('temp_plan_')) {
          console.log(`🔍 Processing item ${item.id} with plan_id: ${item.plan_id}, amount: ${item.amount_cents} cents, user: ${item.user_id}`)
          
          // New flow: Query ALL payments and filter by user_id, plan_id, and total amount (bid + shipping)
          try {
            // Get auction details to calculate total amount (bid + shipping)
            const { data: auction, error: auctionError } = await supabaseServer
              .from('auctions')
              .select('shipping_cost_cents')
              .eq('id', item.auction_id)
              .single()

            if (auctionError) {
              console.error(`Failed to fetch auction ${item.auction_id}:`, auctionError)
              continue
            }

            const shippingCostCents = auction.shipping_cost_cents || 0
            const totalAmountCents = item.amount_cents + shippingCostCents
            const totalAmountDollars = totalAmountCents / 100

            console.log(`Item amount: $${item.amount_cents / 100}, Shipping: $${shippingCostCents / 100}, Total: $${totalAmountDollars}`)

            // Get all payments for the user (no plan_id filter since it doesn't work properly)
            const paymentResponse = await fetch(`https://api.whop.com/v5/app/payments?user_id=${item.user_id}&in_app_payments=true`, {
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json'
              }
            })

            if (!paymentResponse.ok) {
              console.error(`Failed to fetch payments for user ${item.user_id}: ${paymentResponse.status}`)
              continue
            }

            const paymentsData = await paymentResponse.json()
            console.log(`Found ${paymentsData.data?.length || 0} total payments for user ${item.user_id}`)

            // Filter payments by: user_id, plan_id, and total amount (bid + shipping)
            if (paymentsData.data && paymentsData.data.length > 0) {
              console.log(`🔍 Looking for payment matching: user_id=${item.user_id}, plan_id=${item.plan_id}, amount=$${totalAmountDollars}`)
              console.log(`📊 Total payments found: ${paymentsData.data.length}`)
              
              // Log all payments for debugging
              paymentsData.data.forEach((payment: any, index: number) => {
                console.log(`📋 Payment ${index + 1}: id=${payment.id}, user_id=${payment.user_id}, plan_id=${payment.plan_id}, amount=$${payment.final_amount}, status=${payment.status}`)
              })
              
              const matchingPayments = paymentsData.data.filter((payment: any) => {
                const userMatch = payment.user_id === item.user_id
                const planMatch = payment.plan_id === item.plan_id
                const amountMatch = payment.final_amount === totalAmountDollars
                
                console.log(`🔍 Payment ${payment.id}: user_match=${userMatch}, plan_match=${planMatch}, amount_match=${amountMatch} (expected: $${totalAmountDollars}, got: $${payment.final_amount})`)
                
                const matches = userMatch && planMatch && amountMatch
                
                if (matches) {
                  console.log(`✅ Found matching payment: ${payment.id} (status: ${payment.status})`)
                }
                
                return matches
              })
              
              console.log(`Found ${matchingPayments.length} payments matching user_id: ${item.user_id}, plan_id: ${item.plan_id}, total amount: $${totalAmountDollars}`)
              console.log('Matching payments:', matchingPayments.map((p: any) => ({ 
                id: p.id, 
                plan_id: p.plan_id, 
                user_id: p.user_id, 
                amount: p.final_amount,
                status: p.status,
                paid_at: p.paid_at,
                refunded_at: p.refunded_at
              })))
              
              if (matchingPayments.length === 0) {
                console.log(`❌ No payments found for user ${item.user_id}, plan ${item.plan_id}, total amount $${totalAmountDollars} - keeping as pending`)
                continue
              }
              
              // Get the most recent payment (or the one that's not refunded)
              const validPayments = matchingPayments.filter((p: any) => 
                p.status === 'paid' && 
                p.paid_at && 
                !p.refunded_at
              )
              
              console.log(`🔍 Found ${validPayments.length} valid (paid, not refunded) payments out of ${matchingPayments.length} matching payments`)
              
              if (validPayments.length === 0) {
                console.log(`❌ No valid (paid, not refunded) payments found - keeping as pending`)
                continue
              }
              
              const payment = validPayments[0] // Get the first valid payment
              console.log(`✅ Using payment: ${payment.id} for plan ${item.plan_id}, user ${item.user_id}, amount $${payment.final_amount}`)
              console.log(`Payment status for plan ${item.plan_id}: ${payment.status}`)
              
              // Check if payment is successful (API returns "paid" not "succeeded")
              // Also check if it's not refunded
              console.log(`🔍 Checking payment status: ${payment.status}, paid_at: ${payment.paid_at}, refunded_at: ${payment.refunded_at}`)
              
              if (payment.status === 'paid' && payment.paid_at && !payment.refunded_at) {
                console.log(`✅ Payment confirmed - updating barracks item ${item.id} to PAID`)
                
                // Payment confirmed - update barracks item status
                const { error: updateError } = await supabaseServer
                  .from('barracks_items')
                  .update({
                    status: 'PAID',
                    paid_at: new Date(payment.paid_at * 1000).toISOString(), // Convert timestamp to ISO
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', item.id)

                if (updateError) {
                  console.error(`❌ Error updating barracks item ${item.id}:`, updateError)
                  errors.push(`Failed to update barracks item ${item.id}`)
                  continue
                } else {
                  console.log(`✅ Successfully updated barracks item ${item.id} to PAID`)
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
