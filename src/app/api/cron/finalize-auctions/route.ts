import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { notifyAuctionEnded } from '@/lib/notifications'
import { calculateCommissionBreakdown } from '@/lib/payment-system'
import { WhopServerSdk } from '@whop/api'

export async function POST(request: NextRequest) {
  try {
    console.log('Cron job: Finalizing ended auctions')
    
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all LIVE auctions that have ended
    const { data: endedAuctions, error: fetchError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('status', 'LIVE')
      .lt('ends_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching ended auctions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
    }

    if (!endedAuctions || endedAuctions.length === 0) {
      console.log('No auctions to finalize')
      return NextResponse.json({ message: 'No auctions to finalize', finalized: 0 })
    }

    console.log(`Found ${endedAuctions.length} auctions to finalize`)

    let finalizedCount = 0
    const errors: string[] = []

    for (const auction of endedAuctions) {
      try {
        // Get the highest bid for this auction
        const { data: topBid, error: bidError } = await supabaseServer
          .from('bids')
          .select('*')
          .eq('auction_id', auction.id)
          .order('amount_cents', { ascending: false })
          .limit(1)
          .single()

                  if (bidError || !topBid) {
            // No bids, mark as ENDED
            const { error: updateError } = await supabaseServer
              .from('auctions')
              .update({
                status: 'ENDED',
                updated_at: new Date().toISOString()
              })
              .eq('id', auction.id)

            if (updateError) {
              console.error(`Error updating auction ${auction.id}:`, updateError)
              errors.push(`Failed to update auction ${auction.id}`)
            } else {
              console.log(`Auction ${auction.id} ended with no bids`)
              
              // Send notification to seller about no bids
              try {
                const { sendAuctionEndedNoBidsNotification } = await import('@/lib/notifications')
                await sendAuctionEndedNoBidsNotification(
                  auction.created_by_user_id,
                  auction.id,
                  auction.title
                )
                console.log('No bids notification sent for auction:', auction.id)
              } catch (notificationError) {
                console.error('Failed to send no bids notification for auction:', auction.id, notificationError)
              }
              
              finalizedCount++
            }
            continue
          }

        // Calculate total amount (bid + shipping)
        const totalAmount = topBid.amount_cents + (auction.shipping_cost_cents || 0)

        // Calculate commission breakdown
        const breakdown = calculateCommissionBreakdown(
          totalAmount,
          auction.platform_pct,
          auction.community_pct
        )

        console.log(`Charging winner ${topBid.bidder_user_id} for auction ${auction.id}: $${totalAmount/100}`)

        // Create Whop SDK instance for the winner
        const whopSdk = WhopServerSdk({
          appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
          appApiKey: process.env.WHOP_API_KEY!,
          onBehalfOfUserId: topBid.bidder_user_id
        })

        // Create the charge using Whop API
        const chargeResult = await whopSdk.payments.chargeUser({
          amount: totalAmount,
          currency: 'usd' as any,
          userId: topBid.bidder_user_id,
          description: `Payment for auction: ${auction.title}`,
          metadata: {
            auctionId: auction.id,
            experienceId: auction.experience_id,
            bidId: topBid.id,
            breakdown,
            type: 'auction_payment'
          }
        })

        console.log('Charge result:', chargeResult)

        if (!chargeResult) {
          console.error(`Failed to create charge for auction ${auction.id}`)
          errors.push(`Failed to create charge for auction ${auction.id}`)
          continue
        }

        // Update auction with winner, status, and payment info
        const { error: updateError } = await supabaseServer
          .from('auctions')
          .update({
            status: 'PENDING_PAYMENT',
            winner_user_id: topBid.bidder_user_id,
            current_bid_id: topBid.id,
            payment_id: chargeResult.inAppPurchase?.id || chargeResult.inAppPurchase?.planId,
            updated_at: new Date().toISOString()
          })
          .eq('id', auction.id)

        if (updateError) {
          console.error(`Error updating auction ${auction.id}:`, updateError)
          errors.push(`Failed to update auction ${auction.id}`)
          continue
        }

        // Send notifications
        try {
          const { 
            sendAuctionWonNotification, 
            sendAuctionSoldNotification,
            notifyAuctionEnded
          } = await import('@/lib/notifications')
          
          // Notify winner
          await sendAuctionWonNotification(
            topBid.bidder_user_id,
            auction.id,
            auction.title,
            totalAmount
          )
          
          // Notify seller
          await sendAuctionSoldNotification(
            auction.created_by_user_id,
            auction.id,
            auction.title,
            totalAmount
          )
          
          // Get all bidders to notify losers
          const { data: allBids } = await supabaseServer
            .from('bids')
            .select('bidder_user_id')
            .eq('auction_id', auction.id)
          
          if (allBids) {
            const allBidderIds = Array.from(new Set(allBids.map(bid => bid.bidder_user_id)))
            await notifyAuctionEnded(
              auction.id,
              auction.title,
              topBid.bidder_user_id,
              allBidderIds
            )
          }
          
          console.log('Notifications sent for auction:', auction.id)
        } catch (notificationError) {
          console.error('Failed to send notifications for auction:', auction.id, notificationError)
          // Don't fail the auction finalization for notification errors
        }

        console.log(`Auction ${auction.id} finalized with winner ${topBid.bidder_user_id} - Payment created`)
        finalizedCount++

      } catch (error) {
        console.error(`Error processing auction ${auction.id}:`, error)
        errors.push(`Failed to process auction ${auction.id}`)
      }
    }

    return NextResponse.json({
      message: 'Auction finalization completed',
      finalized: finalizedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in auction finalization cron job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
