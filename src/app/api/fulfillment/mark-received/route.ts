import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/fulfillment/mark-received called')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    const { auctionId, userId, experienceId } = body
    
    if (!auctionId || !userId || !experienceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .eq('experience_id', experienceId)
      .single()

    if (auctionError || !auction) {
      console.error('Error fetching auction:', auctionError)
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    // Verify the user is the winner
    if (auction.winner_user_id !== actualUserId) {
      return NextResponse.json({ error: 'Only the winner can mark item as received' }, { status: 403 })
    }

    // Verify it's a physical auction
    if (auction.type !== 'PHYSICAL') {
      return NextResponse.json({ error: 'Only physical items can be marked as received' }, { status: 400 })
    }

    // Verify auction is paid
    if (auction.status !== 'PAID') {
      return NextResponse.json({ error: 'Auction must be paid before marking as received' }, { status: 400 })
    }

    // Update fulfillment record
    const { error: fulfillmentError } = await supabaseServer
      .from('fulfillments')
      .update({
        buyer_marked: true,
        physical_state: 'DELIVERED',
        updated_at: new Date().toISOString()
      })
      .eq('auction_id', auctionId)

    if (fulfillmentError) {
      console.error('Error updating fulfillment:', fulfillmentError)
      return NextResponse.json({ error: 'Failed to mark as received' }, { status: 500 })
    }

    // Update auction status to FULFILLED
    const { error: auctionUpdateError } = await supabaseServer
      .from('auctions')
      .update({
        status: 'FULFILLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', auctionId)

    if (auctionUpdateError) {
      console.error('Error updating auction status:', auctionUpdateError)
      // Don't fail the request if this fails, the fulfillment was already updated
    }

    console.log('Item marked as received successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Item marked as received successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/fulfillment/mark-received:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
