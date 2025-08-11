import { supabaseServer } from './supabase-server'

export interface BidValidationResult {
  isValid: boolean
  error?: string
  nextMinAmount?: number
}

export async function validateBid(
  auctionId: string,
  bidAmount: number,
  currentUserId: string
): Promise<BidValidationResult> {
  try {
    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return { isValid: false, error: 'Auction not found' }
    }

    // Check if auction is live
    if (auction.status !== 'LIVE') {
      return { isValid: false, error: 'Auction is not live' }
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.ends_at)) {
      return { isValid: false, error: 'Auction has ended' }
    }

    // Get current top bid
    const { data: topBid } = await supabaseServer
      .from('bids')
      .select('amount_cents')
      .eq('auction_id', auctionId)
      .order('amount_cents', { ascending: false })
      .limit(1)
      .single()

    const currentTopBid = topBid?.amount_cents || auction.start_price_cents
    const minIncrement = auction.min_increment_cents

    // Check if bid meets minimum increment
    if (bidAmount <= currentTopBid) {
      return { 
        isValid: false, 
        error: 'Bid must be higher than current bid',
        nextMinAmount: currentTopBid + minIncrement
      }
    }

    // Check if bid meets minimum increment requirement
    if (bidAmount < currentTopBid + minIncrement) {
      return { 
        isValid: false, 
        error: `Bid must be at least $${(minIncrement / 100).toFixed(2)} higher`,
        nextMinAmount: currentTopBid + minIncrement
      }
    }

    // Check anti-snipe logic
    const timeUntilEnd = new Date(auction.ends_at).getTime() - new Date().getTime()
    const antiSnipeWindow = auction.anti_snipe_sec * 1000 // Convert to milliseconds

    if (timeUntilEnd <= antiSnipeWindow) {
      // Extend auction by anti-snipe window
      const newEndTime = new Date(Date.now() + antiSnipeWindow)
      
      await supabaseServer
        .from('auctions')
        .update({ ends_at: newEndTime.toISOString() })
        .eq('id', auctionId)
    }

    return { isValid: true }
  } catch (error) {
    console.error('Error validating bid:', error)
    return { isValid: false, error: 'Failed to validate bid' }
  }
}

export function calculateNextBidAmount(currentBid: number, minIncrement: number): number {
  return currentBid + minIncrement
}
