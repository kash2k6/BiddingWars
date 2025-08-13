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
    
    console.log('🔍 Debugging barracks items for auction:', auctionId)
    
    // Get barracks items for this auction
    const { data: barracksItems, error: barracksError } = await supabaseServer
      .from('barracks_items')
      .select('*')
      .eq('auction_id', auctionId)

    if (barracksError) {
      console.error('❌ Error fetching barracks items:', barracksError)
      return NextResponse.json({ 
        success: false, 
        error: barracksError.message
      }, { status: 500 })
    }

    console.log('✅ Found barracks items:', barracksItems?.length || 0)
    
    return NextResponse.json({
      success: true,
      barracksItems: barracksItems || [],
      totalCount: barracksItems?.length || 0
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
