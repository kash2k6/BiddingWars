

export interface NotificationData {
  title: string
  content: string
  experienceId: string
  restPath?: string
  userIds?: string[]
  isMention?: boolean
  senderUserId?: string
}

/**
 * Send a push notification using Whop's notification system
 */
export async function sendPushNotification(data: NotificationData) {
  try {
    console.log('Sending push notification:', data)
    
    // Create a fresh SDK instance for notifications
    const { WhopServerSdk } = await import('@whop/api')
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
    })

    const result = await whopSdk.notifications.sendPushNotification({
      title: data.title,
      content: data.content,
      experienceId: data.experienceId,
      restPath: data.restPath,
      userIds: data.userIds,
      isMention: data.isMention || false,
      senderUserId: data.senderUserId,
    })

    console.log('Push notification sent successfully:', result)
    return { success: true, result }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send notification when a new auction is created
 */
export async function notifyNewAuction(auction: any, experienceId: string) {
  return sendPushNotification({
    title: "🔥 New Auction Alert!",
    content: `"${auction.title}" - Starting at ${(auction.start_price_cents / 100).toFixed(2)}`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    isMention: false,
  })
}

/**
 * Send notification when someone places a bid
 */
export async function notifyNewBid(auction: any, bidAmount: number, bidderUserId: string, experienceId: string) {
  return sendPushNotification({
    title: "💥 New Bid Placed!",
    content: `"${auction.title}" - New bid: $${(bidAmount / 100).toFixed(2)}`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    isMention: true,
    senderUserId: bidderUserId,
  })
}

/**
 * Send notification when someone is outbid
 */
export async function notifyOutbid(auction: any, oldHighestBidderUserId: string, experienceId: string) {
  return sendPushNotification({
    title: "😱 You've Been Outbid!",
    content: `"${auction.title}" - Someone just outbid you!`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [oldHighestBidderUserId],
    isMention: true,
  })
}

/**
 * Send notification when auction ends
 */
export async function notifyAuctionEnded(auction: any, winnerUserId: string, experienceId: string) {
  // Notify the winner
  await sendPushNotification({
    title: "🎉 You Won the Auction!",
    content: `"${auction.title}" - Congratulations! Complete your payment now.`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [winnerUserId],
    isMention: true,
  })

  // Notify the seller
  await sendPushNotification({
    title: "💰 Auction Sold!",
    content: `"${auction.title}" - Your auction has ended and payment is pending.`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [auction.created_by_user_id],
    isMention: true,
  })
}

/**
 * Send notification when payment is completed
 */
export async function notifyPaymentCompleted(auction: any, experienceId: string) {
  // Notify the seller
  await sendPushNotification({
    title: "✅ Payment Received!",
    content: `"${auction.title}" - Payment completed! Time to fulfill the order.`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [auction.created_by_user_id],
    isMention: true,
  })

  // Notify the buyer
  await sendPushNotification({
    title: "📦 Item Ready for Delivery!",
    content: `"${auction.title}" - Payment confirmed! Your item will be shipped soon.`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [auction.winner_user_id],
    isMention: true,
  })
}

/**
 * Send notification when item is shipped
 */
export async function notifyItemShipped(auction: any, experienceId: string) {
  return sendPushNotification({
    title: "🚚 Item Shipped!",
    content: `"${auction.title}" - Your item is on its way!`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [auction.winner_user_id],
    isMention: true,
  })
}

/**
 * Send notification when item is received
 */
export async function notifyItemReceived(auction: any, experienceId: string) {
  return sendPushNotification({
    title: "📦 Item Received!",
    content: `"${auction.title}" - Transaction completed successfully!`,
    experienceId,
    restPath: `/auction/${auction.id}`,
    userIds: [auction.created_by_user_id],
    isMention: true,
  })
}
