import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabaseServer
      .from('auctions')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Database connection failed:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('✅ Database connection successful')
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test passed!',
      timestamp: new Date().toISOString(),
      data: data
    })

  } catch (error) {
    console.error('❌ Database test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
