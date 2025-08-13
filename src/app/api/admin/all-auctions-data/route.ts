import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Getting ALL auctions data across entire database')
    
    // Get ALL auctions with complete data
    const { data: auctions, error: auctionsError } = await supabaseServer
      .from('auctions')
      .select(`
        id,
        title,
        description,
        type,
        status,
        start_price_cents,
        current_bid_id,
        winner_user_id,
        created_by_user_id,
        experience_id,
        created_at,
        starts_at,
        ends_at,
        buy_now_price_cents,
        shipping_cost_cents,
        community_pct,
        platform_pct,
        payment_id,
        updated_at,
        winning_bids(
          id,
          amount_cents,
          user_id,
          created_at,
          payment_processed
        ),
        barracks_items(
          id,
          status,
          paid_at,
          user_id,
          plan_id,
          payment_id,
          amount_cents,
          tracking_number,
          shipping_carrier,
          shipped_at,
          received_at,
          created_at,
          updated_at
        ),
        bids(
          id,
          amount_cents,
          bidder_user_id,
          created_at
        ),
        fulfillments(
          id,
          physical_state,
          dispute_state,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false })

    if (auctionsError) {
      console.error('❌ Error fetching all auctions:', auctionsError)
      return NextResponse.json({ 
        success: false, 
        error: auctionsError.message
      }, { status: 500 })
    }

    // Get all bids across all auctions
    const { data: allBids, error: bidsError } = await supabaseServer
      .from('bids')
      .select(`
        id,
        auction_id,
        amount_cents,
        bidder_user_id,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (bidsError) {
      console.error('❌ Error fetching all bids:', bidsError)
      return NextResponse.json({ 
        success: false, 
        error: bidsError.message
      }, { status: 500 })
    }

    // Get all barracks items
    const { data: allBarracksItems, error: barracksError } = await supabaseServer
      .from('barracks_items')
      .select(`
        id,
        auction_id,
        user_id,
        plan_id,
        payment_id,
        amount_cents,
        status,
        paid_at,
        tracking_number,
        shipping_carrier,
        shipped_at,
        received_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (barracksError) {
      console.error('❌ Error fetching all barracks items:', barracksError)
      return NextResponse.json({ 
        success: false, 
        error: barracksError.message
      }, { status: 500 })
    }

    // Get all winning bids
    const { data: allWinningBids, error: winningBidsError } = await supabaseServer
      .from('winning_bids')
      .select(`
        id,
        auction_id,
        user_id,
        amount_cents,
        payment_processed,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (winningBidsError) {
      console.error('❌ Error fetching all winning bids:', winningBidsError)
      return NextResponse.json({ 
        success: false, 
        error: winningBidsError.message
      }, { status: 500 })
    }

    // Process auctions to add comprehensive payment status and data
    const processedAuctions = auctions?.map(auction => {
      const barracksItem = auction.barracks_items?.[0]
      const winningBid = auction.winning_bids?.[0]
      const fulfillment = auction.fulfillments?.[0]
      
      let paymentStatus = 'UNKNOWN'
      let paymentDetails = null
      
      if (barracksItem) {
        if (barracksItem.status === 'PAID' && barracksItem.paid_at) {
          paymentStatus = 'PAID'
          paymentDetails = {
            paid_at: barracksItem.paid_at,
            plan_id: barracksItem.plan_id,
            payment_id: barracksItem.payment_id
          }
        } else if (barracksItem.status === 'PENDING_PAYMENT') {
          paymentStatus = 'PENDING'
          paymentDetails = {
            plan_id: barracksItem.plan_id,
            payment_id: barracksItem.payment_id
          }
        } else {
          paymentStatus = barracksItem.status || 'UNKNOWN'
        }
      } else if (auction.status === 'PAID') {
        paymentStatus = 'PAID'
      } else if (auction.status === 'ENDED') {
        paymentStatus = 'PENDING'
      }

      // Calculate total bids and highest bid
      const totalBids = auction.bids?.length || 0
      const highestBid = auction.bids?.reduce((max, bid) => 
        bid.amount_cents > max ? bid.amount_cents : max, 0
      ) || 0

      return {
        ...auction,
        payment_status: paymentStatus,
        payment_details: paymentDetails,
        barracks_item: barracksItem,
        winning_bid: winningBid,
        fulfillment: fulfillment,
        total_bids: totalBids,
        highest_bid_cents: highestBid,
        all_bids: auction.bids || []
      }
    }) || []

    // Calculate comprehensive statistics
    const totalAuctions = processedAuctions.length
    const activeAuctions = processedAuctions.filter(a => a.status === 'LIVE').length
    const endedAuctions = processedAuctions.filter(a => a.status === 'ENDED').length
    const paidAuctions = processedAuctions.filter(a => a.payment_status === 'PAID').length
    const pendingPayments = processedAuctions.filter(a => a.payment_status === 'PENDING').length
    
    const totalRevenue = processedAuctions
      .filter(a => a.payment_status === 'PAID')
      .reduce((sum, a) => sum + (a.winning_bid?.amount_cents || 0), 0)
    
    const totalBids = allBids?.length || 0
    const totalBarracksItems = allBarracksItems?.length || 0
    const totalWinningBids = allWinningBids?.length || 0

    console.log('✅ Found comprehensive data:', {
      totalAuctions,
      activeAuctions,
      endedAuctions,
      paidAuctions,
      pendingPayments,
      totalRevenue: totalRevenue / 100,
      totalBids,
      totalBarracksItems,
      totalWinningBids
    })
    
    return NextResponse.json({
      success: true,
      auctions: processedAuctions,
      allBids: allBids || [],
      allBarracksItems: allBarracksItems || [],
      allWinningBids: allWinningBids || [],
      statistics: {
        totalAuctions,
        activeAuctions,
        endedAuctions,
        paidAuctions,
        pendingPayments,
        totalRevenue: totalRevenue / 100,
        totalBids,
        totalBarracksItems,
        totalWinningBids
      }
    })

  } catch (error) {
    console.error('❌ Failed to get all auctions data:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
