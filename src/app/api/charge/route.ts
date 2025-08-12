import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'

export async function POST(request: NextRequest) {
  try {
    const { userId, experienceId, amount, currency = 'usd', metadata } = await request.json()

    console.log('Creating charge for user:', { userId, experienceId, amount, currency })

    // Extract actual user ID from JWT if needed
    let actualUserId = userId
    if (userId.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString())
        actualUserId = payload.sub
        console.log('Extracted user ID from JWT:', actualUserId)
      } catch (error) {
        console.log('Failed to parse JWT, using as-is:', userId)
      }
    }

    const result = await whopSdk.payments.chargeUser({
      amount: amount,
      currency: currency,
      userId: actualUserId,
      // metadata is information that you'd like to receive later about the payment.
      metadata: {
        experienceId: experienceId,
        ...metadata
      },
    })

    console.log('Charge result:', result)

    if (!result?.inAppPurchase) {
      throw new Error("Failed to create charge")
    }

    // Now create a checkout session using the planId from the charge
    console.log('Creating checkout session with planId:', result.inAppPurchase.planId)
    
    // Use HTTPS URL for redirect - this should go to a claim/fulfillment page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
    const redirectUrl = `${baseUrl}/experiences/${experienceId}/claim/${result.inAppPurchase.id}`
    
    console.log('Using redirect URL:', redirectUrl)
    
    const checkoutSession = await whopSdk.payments.createCheckoutSession({
      planId: result.inAppPurchase.planId,
      redirectUrl: redirectUrl,
      metadata: {
        experienceId: experienceId,
        chargeId: result.inAppPurchase.id,
        ...metadata
      },
    })

    console.log('Checkout session result:', checkoutSession)

    // Return both the charge and checkout session
    return NextResponse.json({
      charge: result.inAppPurchase,
      checkoutSession: checkoutSession
    })
  } catch (error) {
    console.error("Error creating charge or checkout session:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ 
      error: "Failed to create charge or checkout session",
      details: error.message 
    }, { status: 500 })
  }
}
