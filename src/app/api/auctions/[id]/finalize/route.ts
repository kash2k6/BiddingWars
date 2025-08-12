import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { 
  chargeUserForAuction, 
  calculateCommissionBreakdown, 
  processPayouts 
} from '@/lib/payment-system'
import { WhopServerSdk } from '@whop/api'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /api/auctions/[id]/finalize called for auction:', params.id)
    
    const body = await request.json()
    console.log('Request body:', body)
    
    // Extract user context from request body
    const { userId, experienceId, companyId, buyNow, amount } = body
    
    if (!userId || !experienceId) {
      console.log('Missing userId or experienceId in request body')
      return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
    }
    
    // Extract actual user ID from JWT if needed
    let actualUserId = userId
    if (userId.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString())
        actualUserId = payload.sub
        console.log('Extracted user ID from JWT:', actualUserId)
      } catch (error) {
        console.log('Failed to parse JWT, using as-is:', userId)
      }
    }

    // Get auction data
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', params.id)
      .eq('experience_id', experienceId)
      .single()

    if (auctionError || !auction) {
      console.error('Error fetching auction:', auctionError)
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    // Check if auction is still live
    if (auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 400 })
    }

    let totalAmount: number
    let paymentDescription: string
    let bidId: string | undefined

    if (buyNow) {
      // Buy Now scenario
      if (!auction.buy_now_price_cents) {
        return NextResponse.json({ error: 'Buy Now not available for this auction' }, { status: 400 })
      }
      
      if (amount !== auction.buy_now_price_cents) {
        return NextResponse.json({ error: 'Invalid buy now amount' }, { status: 400 })
      }
      
      totalAmount = amount + (auction.shipping_cost_cents || 0)
      paymentDescription = `Buy Now purchase for auction: ${auction.title}`
      bidId = undefined // No bid ID for buy now
    } else {
      // Regular auction win scenario
      const { data: topBid, error: bidError } = await supabaseServer
        .from('bids')
        .select('*')
        .eq('auction_id', params.id)
        .order('amount_cents', { ascending: false })
        .limit(1)
        .single()

      if (bidError || !topBid) {
        console.error('Error fetching top bid:', bidError)
        return NextResponse.json({ error: 'No bids found for auction' }, { status: 400 })
      }

      // Verify the user is the highest bidder
      if (topBid.bidder_user_id !== actualUserId) {
        return NextResponse.json({ error: 'You are not the highest bidder' }, { status: 403 })
      }

      totalAmount = topBid.amount_cents + (auction.shipping_cost_cents || 0)
      paymentDescription = `Payment for auction: ${auction.title}`
      bidId = topBid.id
    }

    // Calculate commission breakdown
    const breakdown = calculateCommissionBreakdown(
      totalAmount,
      auction.platform_pct,
      auction.community_pct
    )

    // Create Whop SDK instance for the user
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
      onBehalfOfUserId: actualUserId
    })

    // Create the charge using Whop API
    const chargeResult = await whopSdk.payments.chargeUser({
      amount: totalAmount,
      currency: 'usd' as any,
      userId: actualUserId,
      description: paymentDescription,
      metadata: {
        auctionId: params.id,
        experienceId,
        bidId,
        breakdown
      }
    })

    console.log('Charge result:', chargeResult)

    if (!chargeResult) {
      return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
    }

    // Update auction status to PENDING_PAYMENT
    const updateData: any = {
      status: 'PENDING_PAYMENT',
      winner_user_id: actualUserId,
      payment_id: chargeResult.inAppPurchase?.id || chargeResult.inAppPurchase?.planId,
      updated_at: new Date().toISOString()
    }

    // For regular auctions, include the bid ID
    if (!buyNow) {
      const { data: topBid } = await supabaseServer
        .from('bids')
        .select('id')
        .eq('auction_id', params.id)
        .order('amount_cents', { ascending: false })
        .limit(1)
        .single()
      
      if (topBid) {
        updateData.current_bid_id = topBid.id
      }
    }

    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating auction:', updateError)
      return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 })
    }

    // Return the inAppPurchase object for the frontend
    return NextResponse.json({
      success: true,
      inAppPurchase: {
        planId: chargeResult.inAppPurchase?.planId || 'fallback-plan-id',
        sessionId: chargeResult.inAppPurchase?.id,
        receiptId: chargeResult.inAppPurchase?.id
      },
      auction: {
        id: params.id,
        status: 'PENDING_PAYMENT',
        winner_user_id: actualUserId,
        totalAmount,
        breakdown
      }
    })

  } catch (error) {
    console.error('Error in POST /api/auctions/[id]/finalize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
