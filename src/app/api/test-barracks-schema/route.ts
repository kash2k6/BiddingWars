import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing barracks_items table schema...')
    
    // Test if barracks_items table exists and has shipping_address column
    const { data: schemaData, error: schemaError } = await supabaseServer
      .rpc('get_table_schema', { table_name: 'barracks_items' })

    if (schemaError) {
      console.log('Schema RPC not available, trying direct query...')
      
      // Try to select from barracks_items to see if it exists
      const { data, error } = await supabaseServer
        .from('barracks_items')
        .select('*')
        .limit(1)

      if (error) {
        console.error('❌ barracks_items table error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error.message,
          tableExists: false
        }, { status: 500 })
      }

      // Try to insert a test record to check if shipping_address column exists
      const { data: testData, error: testError } = await supabaseServer
        .from('barracks_items')
        .insert({
          user_id: 'test_user',
          auction_id: '00000000-0000-0000-0000-000000000000',
          plan_id: 'test_plan',
          amount_cents: 100,
          shipping_address: { test: 'data' }
        })
        .select()

      if (testError) {
        console.error('❌ Test insert error:', testError)
        return NextResponse.json({ 
          success: false, 
          error: testError.message,
          tableExists: true,
          shippingAddressColumnExists: false
        }, { status: 500 })
      }

      // Clean up test data
      await supabaseServer
        .from('barracks_items')
        .delete()
        .eq('user_id', 'test_user')

      return NextResponse.json({
        success: true,
        message: 'barracks_items table exists with shipping_address column!',
        tableExists: true,
        shippingAddressColumnExists: true,
        testData: testData
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Schema check completed',
      schemaData: schemaData
    })

  } catch (error) {
    console.error('❌ Barracks schema test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
