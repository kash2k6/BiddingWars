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
    
    console.log('🔍 Debugging auction:', auctionId)
    
    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError) {
      console.error('❌ Error fetching auction:', auctionError)
      return NextResponse.json({ 
        success: false, 
        error: auctionError.message
      }, { status: 500 })
    }

    console.log('✅ Auction found:', auction)
    
    return NextResponse.json({
      success: true,
      auction: auction
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
