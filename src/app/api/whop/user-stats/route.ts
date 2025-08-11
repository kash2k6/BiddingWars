import { NextRequest, NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const { userId, experienceId } = await request.json()

    if (!userId || !experienceId) {
      return NextResponse.json(
        { error: 'User ID and Experience ID are required' },
        { status: 400 }
      )
    }

    console.log('Fetching user stats for:', userId, 'in experience:', experienceId)

    // Get total spent (from completed auctions where user was the winner)
    const { data: wonAuctions, error: wonError } = await supabaseClient
      .from('auctions')
      .select('id, winner_user_id, current_bid_id')
      .eq('experience_id', experienceId)
      .eq('winner_user_id', userId)
      .in('status', ['PAID', 'FULFILLED'])

    if (wonError) {
      console.error('Error fetching won auctions:', wonError)
      return NextResponse.json(
        { error: 'Failed to fetch won auctions' },
        { status: 500 }
      )
    }

    // Get the winning bid amounts
    let totalSpent = 0
    for (const auction of wonAuctions || []) {
      if (auction.current_bid_id) {
        const { data: winningBid } = await supabaseClient
          .from('bids')
          .select('amount_cents')
          .eq('id', auction.current_bid_id)
          .single()

        if (winningBid) {
          totalSpent += winningBid.amount_cents
        }
      }
    }

    // Get active bids (current highest bids by user on live auctions)
    const { data: activeBids, error: activeError } = await supabaseClient
      .from('bids')
      .select(`
        auction_id,
        amount_cents,
        auctions!inner(
          id,
          title,
          status,
          experience_id
        )
      `)
      .eq('bidder_user_id', userId)
      .eq('auctions.experience_id', experienceId)
      .eq('auctions.status', 'LIVE')

    if (activeError) {
      console.error('Error fetching active bids:', activeError)
      return NextResponse.json(
        { error: 'Failed to fetch active bids' },
        { status: 500 }
      )
    }

    // Calculate total active bid amount (sum of user's highest bids on each auction)
    const auctionBids: Record<string, number> = {}
    for (const bid of activeBids || []) {
      const currentHighest = auctionBids[bid.auction_id] || 0
      if (bid.amount_cents > currentHighest) {
        auctionBids[bid.auction_id] = bid.amount_cents
      }
    }

    const totalActiveBids = Object.values(auctionBids).reduce((sum, amount) => sum + amount, 0)

    const stats = {
      totalSpent,
      totalActiveBids,
      activeBidCount: Object.keys(auctionBids).length,
      wonAuctionsCount: wonAuctions?.length || 0
    }

    console.log('User stats:', stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}
