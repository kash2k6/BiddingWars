import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const userContext = await getWhopUserFromRequest(request)
    if (!userContext || !userContext.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { auctionId, experienceId, action, trackingNumber, shippingCarrier } = body

    if (!auctionId || !experienceId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .eq('experience_id', experienceId)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    // Verify auction is paid
    if (auction.status !== 'PAID') {
      return NextResponse.json({ error: 'Auction must be paid before fulfillment' }, { status: 400 })
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_shipped':
        // Verify user is the seller
        if (auction.created_by_user_id !== userContext.userId) {
          return NextResponse.json({ error: 'Only the seller can mark item as shipped' }, { status: 403 })
        }

        if (auction.type !== 'PHYSICAL') {
          return NextResponse.json({ error: 'Only physical items can be marked as shipped' }, { status: 400 })
        }

        updateData = {
          seller_marked: true,
          physical_state: 'SHIPPED',
          tracking_number: trackingNumber,
          shipping_carrier: shippingCarrier
        }
        break

      case 'mark_received':
        // Verify user is the winner
        if (auction.winner_user_id !== userContext.userId) {
          return NextResponse.json({ error: 'Only the winner can mark item as received' }, { status: 403 })
        }

        if (auction.type !== 'PHYSICAL') {
          return NextResponse.json({ error: 'Only physical items can be marked as received' }, { status: 400 })
        }

        updateData = {
          buyer_marked: true,
          physical_state: 'DELIVERED'
        }
        break

      case 'mark_digital_delivered':
        // Verify user is the seller
        if (auction.created_by_user_id !== userContext.userId) {
          return NextResponse.json({ error: 'Only the seller can mark digital item as delivered' }, { status: 403 })
        }

        if (auction.type !== 'DIGITAL') {
          return NextResponse.json({ error: 'Only digital items can be marked as delivered' }, { status: 400 })
        }

        updateData = {
          digital_delivered_at: new Date().toISOString(),
          digital_access_granted: true
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update fulfillment record
    const { error: fulfillmentError } = await supabaseServer
      .from('fulfillments')
      .upsert({
        auction_id: auctionId,
        ...updateData
      })

    if (fulfillmentError) {
      console.error('Error updating fulfillment:', fulfillmentError)
      return NextResponse.json({ error: 'Failed to update fulfillment' }, { status: 500 })
    }

    // If marking as received, also update auction status to FULFILLED
    if (action === 'mark_received') {
      await supabaseServer
        .from('auctions')
        .update({ status: 'FULFILLED' })
        .eq('id', auctionId)
    }

    return NextResponse.json({
      success: true,
      message: 'Fulfillment status updated successfully'
    })

  } catch (error) {
    console.error('Error in fulfillment update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
