import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, planId, auctionId } = await request.json()

    console.log('Checking access for:', { userId, planId, auctionId })

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

    // 1. Check if user has access to the plan
    const accessCheck = await whopSdk.access.checkIfUserHasAccessToAccessPass({
      accessPassId: planId,
      userId: actualUserId,
    })

    console.log('Access check result:', accessCheck)

    if (!accessCheck.hasAccess) {
      return NextResponse.json({
        hasAccess: false,
        message: 'User does not have access to this plan'
      })
    }

    // 2. Get auction details from database
    const supabase = supabaseServer
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({
        hasAccess: false,
        message: 'Auction not found'
      })
    }

    // 3. Update auction status to PAID and set winner
    const { error: updateError } = await supabase
      .from('auctions')
      .update({
        status: 'PAID',
        winner_user_id: actualUserId,
        plan_id: planId,
        paid_at: new Date().toISOString()
      })
      .eq('id', auctionId)

    if (updateError) {
      console.error('Error updating auction:', updateError)
      return NextResponse.json({
        hasAccess: true,
        message: 'Access granted but failed to update auction status'
      })
    }

    // 4. Return fulfillment data based on auction type
    const fulfillmentData = {
      hasAccess: true,
      auction: {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        type: auction.type,
        digital_product: auction.digital_product,
        shipping_address: auction.shipping_address,
        tracking_link: auction.tracking_link
      },
      planId: planId,
      userId: actualUserId
    }

    console.log('Fulfillment data:', fulfillmentData)

    return NextResponse.json(fulfillmentData)

  } catch (error) {
    console.error("Error checking access:", error)
    return NextResponse.json({ 
      hasAccess: false,
      error: "Failed to check access",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
