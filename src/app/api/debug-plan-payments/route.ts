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
    
    console.log('🔍 Debugging payments for plan:', planId)
    
    // Check payments for this plan
    const paymentResponse = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${planId}&in_app_payments=true`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paymentResponse.ok) {
      console.error(`Failed to fetch payments for plan ${planId}: ${paymentResponse.status}`)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch payments: ${paymentResponse.status}` 
      }, { status: 500 })
    }

    const paymentsData = await paymentResponse.json()
    console.log(`Payments for plan ${planId}:`, JSON.stringify(paymentsData, null, 2))
    
    return NextResponse.json({
      success: true,
      planId: planId,
      payments: paymentsData,
      paymentCount: paymentsData.data?.length || 0
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
