import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing environment variables...')
    
    const envVars = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing',
      cronSecretKey: process.env.CRON_SECRET_KEY ? 'Present' : 'Missing',
      whopApiKey: process.env.WHOP_API_KEY ? 'Present' : 'Missing',
      whopAppId: process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'Present' : 'Missing'
    }

    console.log('Environment variables status:', envVars)
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables test',
      timestamp: new Date().toISOString(),
      envVars,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      supabaseKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      cronKeyLength: process.env.CRON_SECRET_KEY?.length || 0
    })

  } catch (error) {
    console.error('❌ Environment test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
