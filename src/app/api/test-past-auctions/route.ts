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
    
    console.log('🔍 Testing past auctions query for experience:', experienceId)
    
    // Same query as marketplace page
    const { data: pastAuctions, error: pastError } = await supabaseServer
      .from('auctions')
      .select(`
        id,
        title,
        description,
        type,
        status,
        start_price_cents,
        buy_now_price_cents,
        starts_at,
        ends_at,
        winner_user_id,
        current_bid_id,
        created_at,
        created_by_user_id,
        bids(
          amount_cents
        )
      `)
      .eq('experience_id', experienceId)
      .in('status', ['ENDED', 'PAID', 'FULFILLED'])
      .not('winner_user_id', 'is', null)
      .order('ends_at', { ascending: false })
      .limit(10)

    if (pastError) {
      console.error('❌ Error fetching past auctions:', pastError)
      return NextResponse.json({ 
        success: false, 
        error: pastError.message
      }, { status: 500 })
    }

    console.log('✅ Found past auctions:', pastAuctions?.length || 0)
    
    return NextResponse.json({
      success: true,
      pastAuctions: pastAuctions || [],
      totalCount: pastAuctions?.length || 0
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
