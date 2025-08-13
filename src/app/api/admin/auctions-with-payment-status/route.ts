import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get('experienceId')
    
    if (!experienceId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing experienceId parameter' 
      }, { status: 400 })
    }
    
    console.log('🔍 Getting auctions with payment status for experience:', experienceId)
    
    // Get all auctions with barracks items to show payment status
    const { data: auctions, error: auctionsError } = await supabaseServer
      .from('auctions')
      .select(`
        id,
        title,
        type,
        status,
        winner_user_id,
        created_at,
        ends_at,
        winning_bids(
          id,
          amount_cents,
          user_id
        ),
        barracks_items(
          id,
          status,
          paid_at,
          user_id
        )
      `)
      .eq('experience_id', experienceId)
      .order('created_at', { ascending: false })

    if (auctionsError) {
      console.error('❌ Error fetching auctions:', auctionsError)
      return NextResponse.json({ 
        success: false, 
        error: auctionsError.message
      }, { status: 500 })
    }

    // Process auctions to add payment status
    const processedAuctions = auctions?.map(auction => {
      const barracksItem = auction.barracks_items?.[0]
      let paymentStatus = 'UNKNOWN'
      
      if (barracksItem) {
        if (barracksItem.status === 'PAID' && barracksItem.paid_at) {
          paymentStatus = 'PAID'
        } else if (barracksItem.status === 'PENDING_PAYMENT') {
          paymentStatus = 'PENDING'
        } else {
          paymentStatus = barracksItem.status || 'UNKNOWN'
        }
      } else if (auction.status === 'PAID') {
        paymentStatus = 'PAID'
      } else if (auction.status === 'ENDED') {
        paymentStatus = 'PENDING'
      }

      return {
        ...auction,
        payment_status: paymentStatus,
        barracks_item: barracksItem
      }
    }) || []

    console.log('✅ Found auctions with payment status:', processedAuctions.length)
    
    return NextResponse.json({
      success: true,
      auctions: processedAuctions
    })

  } catch (error) {
    console.error('❌ Failed to get auctions with payment status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
