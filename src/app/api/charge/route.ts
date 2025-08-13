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

    // For in-app purchases, we don't need a redirect URL - the modal handles the flow
    const chargeParams: any = {
      amount: amountInDollars,
      currency: currency,
      userId: actualUserId,
      // metadata is information that you'd like to receive later about the payment.
      metadata: {
        experienceId: experienceId,
        auctionId: metadata?.auctionId,
        type: metadata?.type,
        barracksItemId: metadata?.barracksItemId,
        ...metadata
      },
    }

    const result = await whopSdk.payments.chargeUser(chargeParams)

    console.log('Charge result:', result)

    if (!result?.inAppPurchase) {
      throw new Error("Failed to create charge")
    }

    // Only create barracks item if this is NOT an auction win (auction wins already have barracks items)
    let barracksItem = null
    if (metadata?.type !== 'auction_win') {
      console.log('Creating barracks item for charge:', result.inAppPurchase.id)
      
      const { data: newBarracksItem, error: barracksError } = await supabaseServer
        .from('barracks_items')
        .insert({
          user_id: actualUserId,
          auction_id: metadata?.auctionId,
          plan_id: result.inAppPurchase.planId,
          amount_cents: amount,
          payment_id: result.inAppPurchase.id,
          status: 'PENDING_PAYMENT',
          paid_at: null // Explicitly set to null for PENDING_PAYMENT status
        })
        .select()
        .single()

      if (barracksError) {
        console.error('Error creating barracks item:', barracksError)
        // Don't fail the entire request, but log the error
      } else {
        console.log('Barracks item created successfully:', newBarracksItem.id)
        barracksItem = newBarracksItem
      }
    } else {
      console.log('Skipping barracks item creation for auction win - will be updated by client')
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
