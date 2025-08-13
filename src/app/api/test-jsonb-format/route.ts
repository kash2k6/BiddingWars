import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { itemId, shippingAddress } = await request.json()
    
    console.log('🧪 Testing JSONB format...')
    console.log('Item ID:', itemId)
    console.log('Shipping Address (raw):', shippingAddress)
    console.log('Shipping Address (stringified):', JSON.stringify(shippingAddress))
    console.log('Shipping Address type:', typeof shippingAddress)
    console.log('Is object:', typeof shippingAddress === 'object')
    console.log('Is array:', Array.isArray(shippingAddress))
    
    // Test the exact same operation as the barracks page
    const updateData = { 
      shipping_address: shippingAddress, 
      updated_at: new Date().toISOString() 
    }
    
    console.log('Update data being sent:', updateData)
    console.log('Update data (stringified):', JSON.stringify(updateData))
    
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
        details: error,
        dataSent: updateData
      }, { status: 500 })
    }

    console.log('✅ Supabase update successful!')
    console.log('Updated data:', data)
    
    // Verify the data was saved correctly
    const { data: verifyData, error: verifyError } = await supabaseServer
      .from('barracks_items')
      .select('shipping_address')
      .eq('id', itemId)
      .single()

    if (verifyError) {
      console.error('❌ Verification error:', verifyError)
    } else {
      console.log('✅ Verified saved data:', verifyData)
    }
    
    return NextResponse.json({
      success: true,
      message: 'JSONB test completed!',
      data: data,
      verifiedData: verifyData,
      dataSent: updateData
    })

  } catch (error) {
    console.error('❌ JSONB test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
