import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { WhopServerSdk } from '@whop/api'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST Cron job: Verifying pending payments')
    
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
    const results: any[] = []

    for (const item of pendingItems) {
      try {
        // Create Whop SDK instance
        const whopSdk = WhopServerSdk({
          appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
          appApiKey: process.env.WHOP_API_KEY!
        })

        // Check if we have a plan_id (new flow) or payment_id (old flow)
        if (item.plan_id && !item.plan_id.startsWith('temp_plan_')) {
          console.log(`Processing item ${item.id} with plan_id: ${item.plan_id}, amount: ${item.amount_cents} cents`)
          
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
              const matchingPayments = paymentsData.data.filter((payment: any) => 
                payment.user_id === item.user_id &&
                payment.plan_id === item.plan_id &&
                payment.final_amount === totalAmountDollars
              )
              
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
                console.log(`No payments found for user ${item.user_id}, plan ${item.plan_id}, total amount $${totalAmountDollars} - keeping as pending`)
                results.push({
                  itemId: item.id,
                  status: 'NO_PAYMENT_FOUND',
                  message: `No payment found for $${totalAmountDollars}`
                })
                continue
              }
              
              // Get the most recent payment (or the one that's not refunded)
              const validPayments = matchingPayments.filter((p: any) => 
                p.status === 'paid' && 
                p.paid_at && 
                !p.refunded_at
              )
              
              if (validPayments.length === 0) {
                console.log(`No valid (paid, not refunded) payments found - keeping as pending`)
                results.push({
                  itemId: item.id,
                  status: 'NO_VALID_PAYMENT',
                  message: 'No valid payment found'
                })
                continue
              }
              
              const payment = validPayments[0] // Get the first valid payment
              console.log(`Payment status for plan ${item.plan_id}: ${payment.status}`)
              
              if (payment.status === 'paid' && payment.paid_at) {
                console.log(`✅ Payment verified for item ${item.id}`)
                
                // Update the barracks item to PAID status
                const { error: updateError } = await supabaseServer
                  .from('barracks_items')
                  .update({
                    status: 'PAID',
                    paid_at: payment.paid_at,
                    payment_id: payment.id,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', item.id)

                if (updateError) {
                  console.error(`Failed to update item ${item.id}:`, updateError)
                  errors.push(`Failed to update item ${item.id}: ${updateError.message}`)
                } else {
                  verifiedCount++
                  results.push({
                    itemId: item.id,
                    status: 'PAYMENT_VERIFIED',
                    message: `Payment verified and item marked as PAID`,
                    paymentId: payment.id,
                    paidAt: payment.paid_at
                  })
                }
              } else {
                console.log(`Payment not completed for item ${item.id}`)
                results.push({
                  itemId: item.id,
                  status: 'PAYMENT_NOT_COMPLETED',
                  message: `Payment status: ${payment.status}`
                })
              }
            } else {
              console.log(`No payments found for user ${item.user_id}`)
              results.push({
                itemId: item.id,
                status: 'NO_PAYMENTS_FOR_USER',
                message: 'No payments found for user'
              })
            }
          } catch (error) {
            console.error(`Error processing item ${item.id}:`, error)
            errors.push(`Error processing item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        } else {
          console.log(`Skipping item ${item.id} - no valid plan_id`)
          results.push({
            itemId: item.id,
            status: 'SKIPPED',
            message: 'No valid plan_id'
          })
        }
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        errors.push(`Error processing item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`✅ Cron job completed. Verified: ${verifiedCount}, Errors: ${errors.length}`)
    
    return NextResponse.json({
      success: true,
      message: `Cron job completed. Verified: ${verifiedCount}, Errors: ${errors.length}`,
      verified: verifiedCount,
      errors: errors,
      results: results
    })

  } catch (error) {
    console.error('❌ Cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
