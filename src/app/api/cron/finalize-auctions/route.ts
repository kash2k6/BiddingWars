import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { notifyAuctionEnded } from '@/lib/notifications'

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
            finalizedCount++
          }
          continue
        }

        // Update auction with winner and status
        const { error: updateError } = await supabaseServer
          .from('auctions')
          .update({
            status: 'PENDING_PAYMENT',
            winner_user_id: topBid.bidder_user_id,
            current_bid_id: topBid.id,
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
          await notifyAuctionEnded(auction, topBid.bidder_user_id, auction.experience_id)
        } catch (notificationError) {
          console.error(`Error sending notification for auction ${auction.id}:`, notificationError)
          // Don't fail the entire process for notification errors
        }

        console.log(`Auction ${auction.id} finalized with winner ${topBid.bidder_user_id}`)
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
