import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing cron job authorization...')
    
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader)
    console.log('Expected:', `Bearer ${process.env.CRON_SECRET_KEY}`)
    console.log('CRON_SECRET_KEY from env:', process.env.CRON_SECRET_KEY)
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      console.log('❌ Authorization failed')
      return NextResponse.json({ 
        error: 'Unauthorized',
        received: authHeader,
        expected: `Bearer ${process.env.CRON_SECRET_KEY}`,
        envKey: process.env.CRON_SECRET_KEY ? 'Present' : 'Missing'
      }, { status: 401 })
    }

    console.log('✅ Authorization successful!')
    
    return NextResponse.json({
      success: true,
      message: 'Cron job authorization test passed!',
      timestamp: new Date().toISOString(),
      envKey: process.env.CRON_SECRET_KEY ? 'Present' : 'Missing'
    })

  } catch (error) {
    console.error('❌ Cron test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
