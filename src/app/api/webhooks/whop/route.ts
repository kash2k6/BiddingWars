import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('whop-signature')

    if (!signature) {
      console.error('No webhook signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // TODO: Implement webhook signature verification
    // const isValid = verifyWebhookSignature(signature, body)
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    // }

    const event = JSON.parse(body)
    console.log('Webhook event received:', event)

    // Handle payment.succeeded events
    if (event.event === 'payment.succeeded') {
      await handlePaymentSucceeded(event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(event: any) {
  try {
    console.log('Processing payment.succeeded event:', event)

    const { 
      receipt_id, 
      final_amount, 
      amount_after_fees, 
      currency, 
      user_id, 
      metadata 
    } = event.data

    // Handle auction win payments (when someone wins an auction and pays)
    // Also handle "Buy It Now" payments
    if ((metadata?.type === 'auction_win' || metadata?.type === 'buy_now') && metadata?.auctionId) {
      const paymentType = metadata.type === 'buy_now' ? 'Buy It Now' : 'Auction Win'
      console.log(`Processing ${paymentType} payment for auction:`, metadata.auctionId)
      
      // Find the barracks item for this auction and user
      const { data: barracksItem, error: findError } = await supabaseServer
        .from('barracks_items')
        .select('*')
        .eq('auction_id', metadata.auctionId)
        .eq('user_id', user_id)
        .eq('status', 'PENDING_PAYMENT')
        .single()

      if (findError || !barracksItem) {
        console.error(`Could not find barracks item for ${paymentType} payment:`, findError)
        return
      }

      // Update the barracks item to mark it as paid
      const { error: updateError } = await supabaseServer
        .from('barracks_items')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          payment_receipt_id: receipt_id,
          amount_received_cents: amount_after_fees * 100 // Convert to cents
        })
        .eq('id', barracksItem.id)

      if (updateError) {
        console.error(`Error updating barracks item for ${paymentType}:`, updateError)
        return
      }

      console.log(`Successfully updated barracks item for ${paymentType}:`, barracksItem.id)

      // Also update the auction status to PAID
      const { error: auctionUpdateError } = await supabaseServer
        .from('auctions')
        .update({
          status: 'PAID',
          winner_user_id: user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', metadata.auctionId)

      if (auctionUpdateError) {
        console.error('Error updating auction status:', auctionUpdateError)
      }

      // Create winning_bid record if it doesn't exist
      const { error: winningBidError } = await supabaseServer
        .from('winning_bids')
        .upsert({
          auction_id: metadata.auctionId,
          user_id: user_id,
          amount_cents: barracksItem.amount_cents,
          payment_processed: true,
          experience_id: barracksItem.experience_id
        }, {
          onConflict: 'auction_id'
        })

      if (winningBidError) {
        console.error('Error creating/updating winning_bid record:', winningBidError)
      }

      // Process payouts to seller and community owner
      try {
        const { processPayouts, calculateCommissionBreakdown } = await import('@/lib/payment-system')
        
        // Get auction details for payout calculation
        const { data: auction, error: auctionError } = await supabaseServer
          .from('auctions')
          .select('created_by_user_id, platform_pct, community_pct, experience_id')
          .eq('id', metadata.auctionId)
          .single()

        if (auctionError || !auction) {
          console.error('Failed to fetch auction for payout:', auctionError)
        } else {
          // Calculate commission breakdown using your system
          const breakdown = calculateCommissionBreakdown(
            amount_after_fees * 100, // Convert to cents
            auction.platform_pct || 3, // Default 3% platform fee
            auction.community_pct || 5  // Default 5% community fee
          )

          // For now, use the experience ID as community owner
          const communityOwnerId = auction.experience_id

          console.log(`Processing payouts for ${paymentType}:`, {
            auctionId: metadata.auctionId,
            breakdown,
            sellerId: auction.created_by_user_id,
            communityOwnerId
          })

          // Process payouts to seller and community owner
          const payoutResult = await processPayouts(
            metadata.auctionId,
            breakdown,
            communityOwnerId,
            auction.created_by_user_id,
            auction.experience_id
          )

          if (payoutResult.success) {
            console.log(`✅ ${paymentType} payouts processed successfully`)
          } else {
            console.error(`❌ ${paymentType} payout errors:`, payoutResult.errors)
          }
        }
      } catch (payoutError) {
        console.error(`Failed to process ${paymentType} payouts:`, payoutError)
      }

      // TODO: Send push notification when notification API is properly configured
      console.log(`Payment confirmed for ${paymentType}. User: ${user_id}, Auction: ${metadata.auctionId}`)
    }

  } catch (error) {
    console.error('Error handling payment.succeeded:', error)
  }
}
