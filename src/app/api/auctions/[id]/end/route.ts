import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopContext } from '@/lib/whop-context'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /api/auctions/[id]/end called for auction:', params.id)
    
    // Get user context
    const context = await getWhopContext()
    if (!context) {
      return NextResponse.json({ error: 'Failed to get user context' }, { status: 401 })
    }

    const { userId, experienceId } = context
    console.log('User context:', { userId, experienceId })

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
