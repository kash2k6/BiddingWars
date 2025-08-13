import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'

export async function POST(request: NextRequest) {
  try {
    const { planId, metadata } = await request.json()

    console.log('Creating checkout session for plan:', planId, 'with metadata:', metadata)

    // Create checkout session using Whop SDK
    const result = await whopSdk.payments.createCheckoutSession({
      planId,
      metadata,
    })

    console.log('Checkout session result:', result)

    if (!result) {
      throw new Error('No result from checkout session creation')
    }

    return NextResponse.json({
      id: result.id,
      planId: result.planId,
      metadata: metadata // Use the metadata from the request instead
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ 
      error: "Failed to create checkout session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
