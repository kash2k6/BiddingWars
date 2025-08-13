import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /api/auctions/[id]/end called for auction:', params.id)
    
    // Extract user context from headers (server-side)
    const userToken = request.headers.get('x-whop-user-token')
    const experienceId = request.headers.get('x-whop-experience-id')
    const companyId = request.headers.get('x-whop-company-id')
    
    if (!userToken || !experienceId) {
      console.error('Missing required headers')
      return NextResponse.json({ error: 'Missing user context' }, { status: 401 })
    }

    // Extract user ID from JWT token
    let userId: string
    try {
      const payload = JSON.parse(Buffer.from(userToken.split('.')[1], 'base64').toString())
      userId = payload.sub
      console.log('Extracted user ID from JWT:', userId)
    } catch (error) {
      console.error('Failed to parse JWT token:', error)
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 })
    }

    console.log('User context:', { userId, experienceId, companyId })

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

    // Check if user is the creator of the auction
    if (auction.created_by_user_id !== userId) {
      console.error('User is not the creator of the auction')
      return NextResponse.json({ error: 'Only the auction creator can end the auction early' }, { status: 403 })
    }

    // Check if auction is still live
    if (auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 400 })
    }

    // Get the highest bid for this auction
    const { data: topBid, error: bidError } = await supabaseServer
      .from('bids')
      .select('*')
      .eq('auction_id', params.id)
      .order('amount_cents', { ascending: false })
      .limit(1)
      .single()

    if (bidError && bidError.code !== 'PGRST116') {
      console.error('Error fetching top bid:', bidError)
      return NextResponse.json({ error: 'Failed to fetch auction bids' }, { status: 500 })
    }

    // Update auction status to ENDED
    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update({
        status: 'ENDED',
        ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating auction status:', updateError)
      return NextResponse.json({ error: 'Failed to end auction' }, { status: 500 })
    }

    // If there are bids, set the winner
    if (topBid) {
      const { error: winnerError } = await supabaseServer
        .from('auctions')
        .update({
          winner_user_id: topBid.bidder_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (winnerError) {
        console.error('Error setting winner:', winnerError)
        // Don't fail the request, just log the error
      }

      console.log('Auction ended with winner:', topBid.bidder_user_id)
    } else {
      console.log('Auction ended with no bids')
    }

    console.log('✅ Auction ended successfully:', params.id)
    return NextResponse.json({ 
      success: true, 
      message: 'Auction ended successfully',
      winner: topBid?.bidder_user_id || null
    })

  } catch (error) {
    console.error('Error ending auction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
