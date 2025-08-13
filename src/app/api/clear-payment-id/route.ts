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
    
    console.log('🔄 Clearing payment_id from barracks item:', itemId)
    
    // Clear the payment_id since it shouldn't be set until payment is actually made
    const { data, error } = await supabaseServer
      .from('barracks_items')
      .update({
        payment_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('❌ Error clearing payment_id:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ Payment ID cleared successfully:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Payment ID cleared from barracks item',
      data: data
    })

  } catch (error) {
    console.error('❌ Clear failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
