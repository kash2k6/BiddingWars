import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Getting barracks items...')
    
    const { data: barracksItems, error } = await supabaseServer
      .from('v_barracks_items')
      .select('*')
      .limit(10)

    if (error) {
      console.error('❌ Error fetching barracks items:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ Found barracks items:', barracksItems?.length || 0)
    
    return NextResponse.json({
      success: true,
      items: barracksItems,
      count: barracksItems?.length || 0
    })

  } catch (error) {
    console.error('❌ Failed to get barracks items:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
