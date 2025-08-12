import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'
import { validateBid } from '@/lib/bids'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /api/auctions/[id]/bid called for auction:', params.id)
    
    const body = await request.json()
    console.log('Request body:', body)
    
    // Extract user context from request body
    const { userId, experienceId, companyId, amountCents } = body
    
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
    
    const whopContext = {
      userId: actualUserId,
      experienceId,
      companyId: companyId || undefined,
    }
    console.log('Whop context:', whopContext)

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 })
    }

    // Validate the bid
    const validation = await validateBid(params.id, amountCents, whopContext.userId)
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.error,
        nextMinAmount: validation.nextMinAmount 
      }, { status: 400 })
    }

    // Place the bid
    const { data: bid, error: bidError } = await supabaseServer
      .from('bids')
      .insert({
        auction_id: params.id,
        bidder_user_id: whopContext.userId,
        amount_cents: amountCents,
      })
      .select()
      .single()

    if (bidError) {
      console.error('Error placing bid:', bidError)
      return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 })
    }

    // Get the previous top bid to check if we need to notify someone they were outbid
    const { data: previousTopBid } = await supabaseServer
      .from('bids')
      .select('bidder_user_id, amount_cents')
      .eq('auction_id', params.id)
      .order('amount_cents', { ascending: false })
      .limit(1)
      .single()

    // Update auction with current bid
    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update({ current_bid_id: bid.id })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating auction:', updateError)
      // Don't fail the request, just log the error
    }

    // Get auction details for notifications
    const { data: auction } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', params.id)
      .single()

    // Send bid alerts to previous highest bidder
    if (previousTopBid && previousTopBid.bidder_user_id !== actualUserId) {
      try {
        const { sendBidAlert } = await import('@/lib/notifications')
        await sendBidAlert(
          previousTopBid.bidder_user_id,
          params.id,
          auction?.title || 'Auction',
          previousTopBid.amount_cents || 0,
          amountCents,
          experienceId
        )
        console.log('Bid alert sent to previous highest bidder')
      } catch (error) {
        console.error('Failed to send bid alert:', error)
        // Don't fail the bid if notification fails
      }
    }
    
    // Calculate next minimum bid amount
    const nextMinCents = amountCents + (auction?.min_increment_cents || 100)
    
    return NextResponse.json({ 
      ok: true, 
      bid,
      nextMinCents
    })
  } catch (error) {
    console.error('Error in POST /api/auctions/[id]/bid:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
