import { WhopServerSdk } from '@whop/api'

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    console.log(`Sending push notification to ${userId}: ${title}`)
    
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
      onBehalfOfUserId: userId
    })

    const result = await whopSdk.notifications.sendPushNotification({
      userId,
      title,
      body,
      data: data || {}
    })

    console.log('Push notification sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send push notification:', error)
    throw error
  }
}

/**
 * Send bid alert when user is outbid
 */
export async function sendBidAlert(
  outbidUserId: string,
  auctionId: string,
  auctionTitle: string,
  currentBid: number,
  newBid: number
) {
  const title = "🚨 You've been outbid!"
  const body = `Someone bid $${(newBid / 100).toFixed(2)} on "${auctionTitle}"`
  
  await sendPushNotification(outbidUserId, title, body, {
    type: 'bid_alert',
    auctionId,
    currentBid,
    newBid,
    auctionTitle
  })
}

/**
 * Send auction ended notification to winner
 */
export async function sendAuctionWonNotification(
  winnerUserId: string,
  auctionId: string,
  auctionTitle: string,
  winningBid: number
) {
  const title = "🎉 You won the auction!"
  const body = `Congratulations! You won "${auctionTitle}" for $${(winningBid / 100).toFixed(2)}`
  
  await sendPushNotification(winnerUserId, title, body, {
    type: 'auction_won',
    auctionId,
    winningBid,
    auctionTitle
  })
}

/**
 * Send auction ended notification to seller
 */
export async function sendAuctionSoldNotification(
  sellerUserId: string,
  auctionId: string,
  auctionTitle: string,
  winningBid: number
) {
  const title = "💰 Your auction sold!"
  const body = `"${auctionTitle}" sold for $${(winningBid / 100).toFixed(2)}`
  
  await sendPushNotification(sellerUserId, title, body, {
    type: 'auction_sold',
    auctionId,
    winningBid,
    auctionTitle
  })
}

/**
 * Send auction ended notification when no bids
 */
export async function sendAuctionEndedNoBidsNotification(
  sellerUserId: string,
  auctionId: string,
  auctionTitle: string
) {
  const title = "⏰ Auction ended"
  const body = `"${auctionTitle}" ended with no bids`
  
  await sendPushNotification(sellerUserId, title, body, {
    type: 'auction_ended_no_bids',
    auctionId,
    auctionTitle
  })
}

/**
 * Notify all bidders when auction ends (except winner)
 */
export async function notifyAuctionEnded(
  auctionId: string,
  auctionTitle: string,
  winnerUserId: string,
  allBidderIds: string[]
) {
  const title = "⏰ Auction ended"
  const body = `"${auctionTitle}" has ended`
  
  // Send to all bidders except winner
  const losers = allBidderIds.filter(id => id !== winnerUserId)
  
  for (const bidderId of losers) {
    try {
      await sendPushNotification(bidderId, title, body, {
        type: 'auction_ended',
        auctionId,
        auctionTitle,
        won: false
      })
    } catch (error) {
      console.error(`Failed to notify bidder ${bidderId}:`, error)
    }
  }
}
