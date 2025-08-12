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

        // Get the charge details from Whop
        const charge = await whopSdk.payments.retrieveCharge({
          chargeId: item.payment_id!
        })

        console.log(`Checking payment status for item ${item.id}:`, charge.status)

        if (charge.status === 'paid') {
          // Payment confirmed - update barracks item status
          const { error: updateError } = await supabaseServer
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

        } else if (charge.status === 'failed' || charge.status === 'canceled') {
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

          console.log(`Payment failed for item ${item.id} - Item removed from barracks, auction reset`)
          verifiedCount++

        } else {
          // Payment still pending - leave as is
          console.log(`Payment still pending for item ${item.id}: ${charge.status}`)
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
