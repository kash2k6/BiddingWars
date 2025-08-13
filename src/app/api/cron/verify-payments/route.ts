import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { WhopServerSdk } from '@whop/api'

export async function POST(request: NextRequest) {
  try {
    console.log('Cron job: Verifying pending payments (webhook fallback)')
    
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all barracks items with PENDING_PAYMENT status that are older than 1 hour
    // This handles edge cases where webhooks might have failed
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: pendingItems, error: fetchError } = await supabaseServer
      .from('barracks_items')
      .select(`
        *,
        auction:auction_id(*)
      `)
      .eq('status', 'PENDING_PAYMENT')
      .not('plan_id', 'is', null)
      .lt('created_at', oneHourAgo) // Only process items older than 1 hour

    if (fetchError) {
      console.error('Error fetching pending items:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending items' }, { status: 500 })
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('No old pending payments to verify')
      return NextResponse.json({ message: 'No old pending payments to verify', verified: 0 })
    }

    console.log(`Found ${pendingItems.length} old pending payments to verify (webhook fallback)`)

    let verifiedCount = 0
    const errors: string[] = []

    for (const item of pendingItems) {
      try {
        console.log(`🔍 Checking old payment for item ${item.id}, user: ${item.user_id}, plan: ${item.plan_id}`)
        
        // Create Whop SDK instance
        const whopSdk = WhopServerSdk({
          appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
          appApiKey: process.env.WHOP_API_KEY!
        })

        // Get auction details to calculate total amount
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

        // Get payments for this user and plan
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
        
        // Look for a successful payment that matches our criteria
        const matchingPayment = paymentsData.data?.find((payment: any) => {
          return payment.user_id === item.user_id &&
                 payment.plan_id === item.plan_id &&
                 Math.abs(payment.final_amount - totalAmountDollars) < 0.01 && // Allow small rounding differences
                 payment.status === 'succeeded'
        })

        if (matchingPayment) {
          console.log(`✅ Found matching payment for item ${item.id}: ${matchingPayment.id}`)
          
          // Update the barracks item to mark it as paid
          const { error: updateError } = await supabaseServer
            .from('barracks_items')
            .update({
              status: 'PAID',
              paid_at: new Date().toISOString(),
              payment_receipt_id: matchingPayment.receipt_id,
              amount_received_cents: Math.round(matchingPayment.amount_after_fees * 100)
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`Error updating barracks item ${item.id}:`, updateError)
            errors.push(`Failed to update item ${item.id}: ${updateError.message}`)
          } else {
            console.log(`✅ Successfully updated barracks item ${item.id} as paid`)
            verifiedCount++
          }
        } else {
          console.log(`❌ No matching payment found for item ${item.id}`)
        }

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        errors.push(`Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`Cron job completed: ${verifiedCount} items verified, ${errors.length} errors`)
    
    return NextResponse.json({
      message: 'Payment verification completed',
      verified: verifiedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
