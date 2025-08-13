import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json()
    
    if (!itemId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing itemId parameter' 
      }, { status: 400 })
    }
    
    console.log('🔄 Resetting barracks item:', itemId)
    
    // Reset the barracks item back to PENDING_PAYMENT
    const { data, error } = await supabaseServer
      .from('barracks_items')
      .update({
        status: 'PENDING_PAYMENT',
        paid_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('❌ Error resetting barracks item:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ Barracks item reset successfully:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Barracks item reset to PENDING_PAYMENT',
      data: data
    })

  } catch (error) {
    console.error('❌ Reset failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
