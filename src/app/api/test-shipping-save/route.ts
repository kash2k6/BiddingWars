import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { itemId, shippingAddress } = await request.json()
    
    console.log('🧪 Testing shipping address save...')
    console.log('Item ID:', itemId)
    console.log('Shipping Address:', shippingAddress)
    
    // Test the exact same operation as the barracks page
    const updateData = { 
      shipping_address: shippingAddress, 
      updated_at: new Date().toISOString() 
    }
    
    console.log('Update data being sent to Supabase:', updateData)
    
    const { data, error } = await supabaseServer
      .from('barracks_items')
      .update(updateData)
      .eq('id', itemId)
      .select()

    console.log('Supabase response:', { data, error })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('✅ Supabase update successful!')
    console.log('Updated data:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Shipping address saved successfully!',
      data: data
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
