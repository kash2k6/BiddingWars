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
    
    console.log('🔍 Debugging auctions for experience:', experienceId)
    
    // Get all auctions for this experience
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

    console.log('✅ Found auctions:', auctions?.length || 0)
    
    return NextResponse.json({
      success: true,
      auctions: auctions || [],
      totalCount: auctions?.length || 0
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
