import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing all available plans...')
    
    // List all plans for the app
    const plansResponse = await fetch(`https://api.whop.com/v5/app/plans`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!plansResponse.ok) {
      console.error(`Failed to fetch plans: ${plansResponse.status}`)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch plans: ${plansResponse.status}`,
        status: plansResponse.status
      }, { status: 500 })
    }

    const plansData = await plansResponse.json()
    console.log(`All plans:`, JSON.stringify(plansData, null, 2))
    
    return NextResponse.json({
      success: true,
      plans: plansData,
      planCount: plansData.data?.length || 0
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
