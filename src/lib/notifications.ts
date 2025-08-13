import { WhopServerSdk } from '@whop/api'

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  content: string,
  experienceId: string,
  restPath?: string
) {
  try {
    console.log(`Sending push notification to ${userId}: ${title}`)
    
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
    })

    const result = await whopSdk.notifications.sendPushNotification({
      title,
      content,
      experienceId,
      userIds: [userId],
      restPath: restPath || undefined
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
  newBid: number,
  experienceId: string
) {
  const title = "🚨 You've been outbid!"
  const content = `Someone bid $${(newBid / 100).toFixed(2)} on "${auctionTitle}"`
  
  await sendPushNotification(
    outbidUserId, 
    title, 
    content, 
    experienceId,
    `/auction/${auctionId}`
  )
}

/**
 * Send auction ended notification to winner
 */
export async function sendAuctionWonNotification(
  winnerUserId: string,
  auctionId: string,
  auctionTitle: string,
  winningBid: number,
  experienceId: string
) {
  const title = "🎉 You won the auction!"
  const content = `Congratulations! You won "${auctionTitle}" for $${(winningBid / 100).toFixed(2)}`
  
  await sendPushNotification(
    winnerUserId, 
    title, 
    content, 
    experienceId,
    `/auction/${auctionId}`
  )
}

/**
 * Send auction ended notification to seller
 */
export async function sendAuctionSoldNotification(
  sellerUserId: string,
  auctionId: string,
  auctionTitle: string,
  winningBid: number,
  experienceId: string
) {
  const title = "💰 Your auction sold!"
  const content = `"${auctionTitle}" sold for $${(winningBid / 100).toFixed(2)}`
  
  await sendPushNotification(
    sellerUserId, 
    title, 
    content, 
    experienceId,
    `/auction/${auctionId}`
  )
}

/**
 * Send auction ended notification when no bids
 */
export async function sendAuctionEndedNoBidsNotification(
  sellerUserId: string,
  auctionId: string,
  auctionTitle: string,
  experienceId: string
) {
  const title = "⏰ Auction ended"
  const content = `"${auctionTitle}" ended with no bids`
  
  await sendPushNotification(
    sellerUserId, 
    title, 
    content, 
    experienceId,
    `/auction/${auctionId}`
  )
}

/**
 * Notify all bidders when auction ends (except winner)
 */
export async function notifyAuctionEnded(
  auctionId: string,
  auctionTitle: string,
  winnerUserId: string,
  allBidderIds: string[],
  experienceId: string
) {
  const title = "⏰ Auction ended"
  const content = `"${auctionTitle}" has ended`
  
  // Send to all bidders except winner
  const losers = allBidderIds.filter(id => id !== winnerUserId)
  
  for (const bidderId of losers) {
    try {
      await sendPushNotification(
        bidderId, 
        title, 
        content, 
        experienceId,
        `/auction/${auctionId}`
      )
    } catch (error) {
      console.error(`Failed to notify bidder ${bidderId}:`, error)
    }
  }
}

/**
 * Send payment confirmation notification to winner
 */
export async function sendPaymentConfirmedNotification(
  winnerUserId: string,
  auctionId: string,
  auctionTitle: string,
  experienceId: string
) {
  const title = "✅ Payment Confirmed!"
  const content = `Your payment for "${auctionTitle}" has been confirmed. Your item is now available!`
  
  await sendPushNotification(
    winnerUserId, 
    title, 
    content, 
    experienceId,
    `/barracks`
  )
}

/**
 * Send item shipped notification to winner
 */
export async function sendItemShippedNotification(
  winnerUserId: string,
  auctionId: string,
  auctionTitle: string,
  trackingNumber: string,
  shippingCarrier: string,
  experienceId: string
) {
  const title = "📦 Your item has been shipped!"
  const content = `"${auctionTitle}" has been shipped via ${shippingCarrier}. Tracking: ${trackingNumber}`
  
  await sendPushNotification(
    winnerUserId, 
    title, 
    content, 
    experienceId,
    `/barracks`
  )
}

/**
 * Send item received notification to seller
 */
export async function sendItemReceivedNotification(
  sellerUserId: string,
  auctionId: string,
  auctionTitle: string,
  experienceId: string
) {
  const title = "📬 Item Delivered!"
  const content = `The buyer has confirmed receipt of "${auctionTitle}". Transaction complete!`
  
  await sendPushNotification(
    sellerUserId, 
    title, 
    content, 
    experienceId,
    `/auctions`
  )
}

/**
 * Send digital product access notification to winner
 */
export async function sendDigitalProductAccessNotification(
  winnerUserId: string,
  auctionId: string,
  auctionTitle: string,
  experienceId: string
) {
  const title = "🎁 Digital Product Ready!"
  const content = `Your digital product "${auctionTitle}" is now available for download!`
  
  await sendPushNotification(
    winnerUserId, 
    title, 
    content, 
    experienceId,
    `/barracks`
  )
}

/**
 * Send auction creation notification to community
 */
export async function sendNewAuctionNotification(
  experienceId: string,
  auctionId: string,
  auctionTitle: string,
  startingPrice: number
) {
  const title = "🆕 New Auction Live!"
  const content = `"${auctionTitle}" is now live! Starting at $${(startingPrice / 100).toFixed(2)}`
  
  // Send to all users in the experience
  try {
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
    })

    const result = await whopSdk.notifications.sendPushNotification({
      title,
      content,
      experienceId,
      restPath: `/auction/${auctionId}`
    })

    console.log('New auction notification sent to community:', result)
    return result
  } catch (error) {
    console.error('Failed to send new auction notification:', error)
    throw error
  }
}
