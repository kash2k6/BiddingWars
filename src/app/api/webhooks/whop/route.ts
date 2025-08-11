import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { processPayouts, calculateCommissionBreakdown } from '@/lib/payment-system'

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook received from Whop')
    
    const event = await request.json()
    console.log('Webhook event:', JSON.stringify(event, null, 2))

    // Verify webhook signature (you should implement this)
    // const signature = request.headers.get('whop-signature')
    // if (!verifyWebhookSignature(signature, event)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    if (event.type === 'payment.succeeded') {
      await handlePaymentSucceeded(event.data)
    } else if (event.type === 'payment.failed') {
      await handlePaymentFailed(event.data)
    } else if (event.type === 'refund.updated') {
      await handleRefundUpdated(event.data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentData: any) {
  try {
    console.log('Processing payment succeeded:', paymentData)

    const { auctionId, experienceId, type } = paymentData.metadata || {}

    if (!auctionId || type !== 'auction_payment') {
      console.log('No auction ID or wrong type in payment metadata')
      return
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      console.error('Error fetching auction:', auctionError)
      return
    }

    // Update auction status to PAID
    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update({
        status: 'PAID',
        payment_id: paymentData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', auctionId)

    if (updateError) {
      console.error('Error updating auction status:', updateError)
      return
    }

    // Calculate commission breakdown
    const breakdown = calculateCommissionBreakdown(
      paymentData.amount,
      auction.platform_pct,
      auction.community_pct
    )

    // Process payouts
    try {
      // Get the experience to find the company ID for payouts
      const { WhopServerSdk } = await import('@whop/api')
      
      // Create a fresh SDK instance without onBehalfOfUserId to get experience details
      const experienceSdk = WhopServerSdk({
        appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
        appApiKey: process.env.WHOP_API_KEY!,
      })
      
      const experience = await experienceSdk.experiences.getExperience({ 
        experienceId: experienceId 
      })
      const companyId = experience.company.id
      const companyName = experience.company.title
      const communityOwnerId = auction.created_by_user_id

      console.log('Processing payouts for company:', companyId, 'name:', companyName, 'owner:', communityOwnerId)

      const payoutResult = await processPayouts(
        auctionId,
        breakdown,
        communityOwnerId,
        auction.created_by_user_id,
        experienceId
      )

      if (!payoutResult.success) {
        console.error('Payout errors:', payoutResult.errors)
      } else {
        console.log('Payouts processed successfully')
      }
    } catch (payoutError) {
      console.error('Error processing payouts:', payoutError)
    }

    // Create fulfillment record
    const { error: fulfillmentError } = await supabaseServer
      .from('fulfillments')
      .insert({
        auction_id: auctionId,
        physical_state: auction.type === 'PHYSICAL' ? 'PENDING_SHIP' : null,
        dispute_state: 'NONE'
      })

    if (fulfillmentError) {
      console.error('Error creating fulfillment record:', fulfillmentError)
    }

    console.log('Payment succeeded processing completed')
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(paymentData: any) {
  try {
    console.log('Processing payment failed:', paymentData)

    const { auctionId } = paymentData.metadata || {}

    if (!auctionId) {
      console.log('No auction ID in payment metadata')
      return
    }

    // Update auction status back to LIVE
    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update({
        status: 'LIVE',
        winner_user_id: null,
        current_bid_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', auctionId)

    if (updateError) {
      console.error('Error updating auction status:', updateError)
    }

    console.log('Payment failed processing completed')
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleRefundUpdated(refundData: any) {
  try {
    console.log('Processing refund updated:', refundData)

    const { auctionId } = refundData.metadata || {}

    if (!auctionId) {
      console.log('No auction ID in refund metadata')
      return
    }

    // Update fulfillment dispute state
    const { error: updateError } = await supabaseServer
      .from('fulfillments')
      .update({
        dispute_state: 'REFUNDED',
        updated_at: new Date().toISOString()
      })
      .eq('auction_id', auctionId)

    if (updateError) {
      console.error('Error updating fulfillment dispute state:', updateError)
    }

    console.log('Refund updated processing completed')
  } catch (error) {
    console.error('Error handling refund updated:', error)
  }
}
