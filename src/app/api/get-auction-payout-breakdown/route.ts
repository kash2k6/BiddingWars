import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculatePayoutDistribution } from '@/lib/payouts'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')
    
    if (!auctionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing auctionId parameter' 
      }, { status: 400 })
    }
    
    console.log('💰 Getting payout breakdown for auction:', auctionId)
    
    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(`
        *,
        winning_bids!inner(*)
      `)
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Get the winning bid amount
    const winningBid = auction.winning_bids?.[0]
    if (!winningBid) {
      return NextResponse.json(
        { error: 'No winning bid found for this auction' },
        { status: 400 }
      )
    }

    // Calculate total amount (winning bid amount in dollars)
    const totalAmount = winningBid.amount_cents / 100

    // Calculate payout distribution
    const payoutCalculation = calculatePayoutDistribution(totalAmount)

    console.log('✅ Payout breakdown calculated:', payoutCalculation)
    
    return NextResponse.json({
      success: true,
      auction: {
        id: auction.id,
        title: auction.title,
        type: auction.type,
        totalAmount: totalAmount,
        sellerUserId: auction.created_by_user_id
      },
      payoutBreakdown: {
        totalAmount: payoutCalculation.totalAmount,
        platformFee: payoutCalculation.platformFee,
        sellerAmount: payoutCalculation.sellerAmount,
        communityOwnerAmount: payoutCalculation.communityOwnerAmount,
        businessRevenue: payoutCalculation.businessRevenue
      }
    })

  } catch (error) {
    console.error('❌ Failed to get payout breakdown:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
