// Auction status utility functions
export interface AuctionTiming {
  starts_at: string
  ends_at: string
  status: string
}

export function getAuctionStatus(timing: AuctionTiming): string {
  const now = new Date()
  const startTime = new Date(timing.starts_at)
  const endTime = new Date(timing.ends_at)

  // If auction has ended
  if (now > endTime) {
    return 'ENDED'
  }

  // If auction hasn't started yet
  if (now < startTime) {
    return 'SCHEDULED'
  }

  // Auction is currently live
  return 'LIVE'
}

export function getTimeUntilStart(startsAt: string): number {
  const now = new Date().getTime()
  const startTime = new Date(startsAt).getTime()
  return Math.max(0, startTime - now)
}

export function getTimeUntilEnd(endsAt: string): number {
  const now = new Date().getTime()
  const endTime = new Date(endsAt).getTime()
  return Math.max(0, endTime - now)
}

export function isAuctionLive(timing: AuctionTiming): boolean {
  return getAuctionStatus(timing) === 'LIVE'
}

export function isAuctionScheduled(timing: AuctionTiming): boolean {
  return getAuctionStatus(timing) === 'SCHEDULED'
}

export function isAuctionEnded(timing: AuctionTiming): boolean {
  return getAuctionStatus(timing) === 'ENDED'
}

export function canBidOnAuction(timing: AuctionTiming, currentStatus: string): boolean {
  // Can bid if auction is live OR if it's scheduled but the start time has passed
  const calculatedStatus = getAuctionStatus(timing)
  return calculatedStatus === 'LIVE' || (currentStatus === 'LIVE' && calculatedStatus === 'LIVE')
}
