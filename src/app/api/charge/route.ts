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
    
    // For now, don't use redirectUrl since localhost is not accepted by Whop
    // The user will be redirected back to the app after payment completion
    const checkoutSession = await whopSdk.payments.createCheckoutSession({
      planId: result.inAppPurchase.planId,
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
