import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')
    
    if (!planId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing planId parameter' 
      }, { status: 400 })
    }
    
    console.log('🔍 Debugging plan details for:', planId)
    
    // Check if this plan exists - using the app-specific API endpoint
    const planResponse = await fetch(`https://api.whop.com/v5/app/plans/${planId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!planResponse.ok) {
      console.error(`Failed to fetch plan ${planId}: ${planResponse.status}`)
      return NextResponse.json({ 
        success: false, 
        error: `Plan not found: ${planResponse.status}`,
        status: planResponse.status
      }, { status: 404 })
    }

    const planData = await planResponse.json()
    console.log(`Plan details for ${planId}:`, JSON.stringify(planData, null, 2))
    
    return NextResponse.json({
      success: true,
      planId: planId,
      plan: planData,
      exists: true
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
