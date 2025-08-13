import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    if (!itemId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing itemId parameter' 
      }, { status: 400 })
    }
    
    console.log('🔍 Debugging barracks item:', itemId)
    
    // Check both the barracks_items table and the view
    const { data: barracksItem, error: barracksError } = await supabaseServer
      .from('barracks_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (barracksError) {
      console.error('❌ Error fetching from barracks_items:', barracksError)
      return NextResponse.json({ 
        success: false, 
        error: barracksError.message
      }, { status: 500 })
    }

    const { data: viewItem, error: viewError } = await supabaseServer
      .from('v_barracks_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (viewError) {
      console.error('❌ Error fetching from view:', viewError)
    }

    console.log('✅ Barracks item data:', barracksItem)
    console.log('✅ View item data:', viewItem)
    
    return NextResponse.json({
      success: true,
      barracksItem: barracksItem,
      viewItem: viewItem,
      shippingAddressExists: !!barracksItem?.shipping_address,
      shippingAddressData: barracksItem?.shipping_address
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
