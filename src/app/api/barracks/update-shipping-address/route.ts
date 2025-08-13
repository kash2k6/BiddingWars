import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { itemId, shippingAddress } = await request.json()
    
    console.log('🔄 Updating shipping address via server API...')
    console.log('Item ID:', itemId)
    console.log('Shipping Address:', shippingAddress)
    
    if (!itemId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: itemId' 
      }, { status: 400 })
    }

    // Allow shippingAddress to be null (for clearing the address)
    if (shippingAddress === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: shippingAddress' 
      }, { status: 400 })
    }

    const updateData = { 
      shipping_address: shippingAddress, 
      updated_at: new Date().toISOString() 
    }
    
    console.log('Update data:', updateData)
    
    const { data, error } = await supabaseServer
      .from('barracks_items')
      .update(updateData)
      .eq('id', itemId)
      .select()

    console.log('Server update result:', { data, error })

    if (error) {
      console.error('❌ Server update error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('✅ Server update successful!')
    console.log('Updated data:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Shipping address updated successfully!',
      data: data
    })

  } catch (error) {
    console.error('❌ Server API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
