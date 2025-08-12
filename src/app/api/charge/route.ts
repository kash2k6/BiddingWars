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

    // Convert amount from cents to dollars for Whop API
    const amountInDollars = amount / 100
    console.log('Converting amount from cents to dollars:', { cents: amount, dollars: amountInDollars })

    const result = await whopSdk.payments.chargeUser({
      amount: amountInDollars,
      currency: currency,
      userId: actualUserId,
      // Add redirect URL to barracks for post-payment
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/experiences/${experienceId}/barracks`,
      // metadata is information that you'd like to receive later about the payment.
      metadata: {
        experienceId: experienceId,
        auctionId: metadata?.auctionId,
        type: metadata?.type,
        ...metadata
      },
    })

    console.log('Charge result:', result)

    if (!result?.inAppPurchase) {
      throw new Error("Failed to create charge")
    }

    // Return the charge with planId - we'll use the planId directly for checkout
    console.log('Charge created successfully with planId:', result.inAppPurchase.planId)

    // Return the charge object which contains the planId
    return NextResponse.json({
      charge: result.inAppPurchase
    })
  } catch (error) {
    console.error("Error creating charge or checkout session:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    return NextResponse.json({ 
      error: "Failed to create charge or checkout session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
