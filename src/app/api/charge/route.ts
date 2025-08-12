import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'
import { supabaseServer } from '@/lib/supabase-server'

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

    // Only use redirect URL for production (not localhost)
    const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') || !process.env.NEXT_PUBLIC_APP_URL
    
    const chargeParams: any = {
      amount: amountInDollars,
      currency: currency,
      userId: actualUserId,
      // metadata is information that you'd like to receive later about the payment.
      metadata: {
        experienceId: experienceId,
        auctionId: metadata?.auctionId,
        type: metadata?.type,
        ...metadata
      },
    }

    // Only add redirect URL for production
    if (!isLocalhost) {
      chargeParams.redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/experiences/${experienceId}/barracks?payment_success=true`
    }

    const result = await whopSdk.payments.chargeUser(chargeParams)

    console.log('Charge result:', result)

    if (!result?.inAppPurchase) {
      throw new Error("Failed to create charge")
    }

    // Create barracks item with PENDING_PAYMENT status
    console.log('Creating barracks item for charge:', result.inAppPurchase.id)
    
    const { data: barracksItem, error: barracksError } = await supabaseServer
      .from('barracks_items')
      .insert({
        user_id: actualUserId,
        auction_id: metadata?.auctionId,
        plan_id: result.inAppPurchase.planId,
        amount_cents: amount,
        payment_id: result.inAppPurchase.id,
        status: 'PENDING_PAYMENT'
      })
      .select()
      .single()

    if (barracksError) {
      console.error('Error creating barracks item:', barracksError)
      // Don't fail the entire request, but log the error
    } else {
      console.log('Barracks item created successfully:', barracksItem.id)
    }

    // Return the charge with planId - we'll use the planId directly for checkout
    console.log('Charge created successfully with planId:', result.inAppPurchase.planId)

    // Return the charge object which contains the planId
    return NextResponse.json({
      charge: result.inAppPurchase,
      barracksItem: barracksItem
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
