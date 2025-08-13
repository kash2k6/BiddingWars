import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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
    
    console.log('🔍 Debugging winning bid for auction:', auctionId)
    
    // Get winning bid for this auction
    const { data: winningBid, error: winningBidError } = await supabaseServer
      .from('winning_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .single()

    if (winningBidError) {
      console.error('❌ Error fetching winning bid:', winningBidError)
      return NextResponse.json({ 
        success: false, 
        error: winningBidError.message
      }, { status: 500 })
    }

    console.log('✅ Found winning bid:', winningBid)
    
    return NextResponse.json({
      success: true,
      winningBid: winningBid
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
