import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking RLS policies...')
    
    // Try to get the current user context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('Checking for user:', userId)
    
    // Test if we can read from barracks_items
    const { data: readData, error: readError } = await supabaseServer
      .from('barracks_items')
      .select('id, user_id, shipping_address')
      .eq('user_id', userId)
      .limit(1)

    console.log('Read test result:', { readData, readError })

    // Test if we can update a barracks item
    if (readData && readData.length > 0) {
      const testItem = readData[0]
      console.log('Testing update on item:', testItem.id)
      
      const { data: updateData, error: updateError } = await supabaseServer
        .from('barracks_items')
        .update({ 
          shipping_address: { test: 'data' },
          updated_at: new Date().toISOString()
        })
        .eq('id', testItem.id)
        .select()

      console.log('Update test result:', { updateData, updateError })
      
      return NextResponse.json({
        success: true,
        readTest: { data: readData, error: readError },
        updateTest: { data: updateData, error: updateError },
        testItem: testItem
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'No barracks items found for user',
        readTest: { data: readData, error: readError }
      })
    }

  } catch (error) {
    console.error('❌ RLS check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
