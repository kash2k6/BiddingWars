import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/fulfillment/update-status called')
    
    const body = await request.json()
    console.log('📦 Request body:', body)
    
    const { auctionId, experienceId, action, trackingNumber, shippingCarrier } = body

    if (!auctionId || !experienceId || !action) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userContext = await getWhopUserFromRequest(request)
    console.log('👤 User context:', userContext)
    
    if (!userContext || !userContext.userId) {
      console.log('❌ Unauthorized - no user context')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .eq('experience_id', experienceId)
      .single()

    if (auctionError || !auction) {
      console.log('❌ Auction not found:', auctionError)
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    
    console.log('📦 Auction found:', {
      id: auction.id,
      title: auction.title,
      created_by_user_id: auction.created_by_user_id,
      winner_user_id: auction.winner_user_id,
      status: auction.status,
      type: auction.type
    })

    // Verify auction is paid or has a winning bid with payment
    if (auction.status !== 'PAID') {
      // Check if there's a winning bid with payment processed
      const { data: winningBid } = await supabaseServer
        .from('winning_bids')
        .select('payment_processed, payment_id')
        .eq('auction_id', auctionId)
        .single()
      
      if (!winningBid || !winningBid.payment_processed) {
        return NextResponse.json({ error: 'Auction must be paid before fulfillment' }, { status: 400 })
      }
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_shipped':
        // For mark_shipped: Only the original seller (created_by_user_id) can mark as shipped
        // If created_by_user_id is null, it means it was created by system/admin and anyone can mark as shipped
        const isSeller = auction.created_by_user_id === userContext.userId
        const isSystemCreated = auction.created_by_user_id === null
        
        console.log('🔍 Mark Shipped Authorization:', {
          isSeller,
          isSystemCreated,
          sellerId: auction.created_by_user_id,
          userId: userContext.userId,
          auctionTitle: auction.title
        })
        
        if (!isSeller && !isSystemCreated) {
          console.log('❌ User is not the seller and auction is not system-created')
          return NextResponse.json({ error: 'Only the seller can mark item as shipped' }, { status: 403 })
        }
        
        if (isSystemCreated) {
          console.log('✅ System-created auction - allowing any user to mark as shipped')
        } else {
          console.log('✅ User is the seller - authorized to mark as shipped')
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
        // For mark_received: Only the winner (winner_user_id) can mark as received
        const isWinner = auction.winner_user_id === userContext.userId
        
        console.log('🔍 Mark Received Authorization:', {
          isWinner,
          winnerId: auction.winner_user_id,
          userId: userContext.userId,
          auctionTitle: auction.title
        })
        
        if (!isWinner) {
          console.log('❌ User is not the winner')
          return NextResponse.json({ error: 'Only the winner can mark item as received' }, { status: 403 })
        }
        console.log('✅ User is authorized to mark as received')

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

    // Also update barracks_items table for shipping information
    if (action === 'mark_shipped' && trackingNumber && shippingCarrier) {
      console.log('📦 Updating barracks_items for auction:', auctionId)
      console.log('📦 Tracking:', trackingNumber, 'Carrier:', shippingCarrier)
      
      // First check if barracks_items exists
      const { data: existingBarracks } = await supabaseServer
        .from('barracks_items')
        .select('id, status')
        .eq('auction_id', auctionId)
        .single()
      
      if (!existingBarracks) {
        console.log('❌ No barracks_items found for auction:', auctionId)
        return NextResponse.json({ error: 'No barracks item found for this auction' }, { status: 404 })
      }
      
      console.log('📦 Existing barracks item:', existingBarracks)
      
      const { data: barracksData, error: barracksError } = await supabaseServer
        .from('barracks_items')
        .update({
          status: 'SHIPPED',
          tracking_number: trackingNumber,
          shipping_carrier: shippingCarrier,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('auction_id', auctionId)
        .select()

      console.log('📦 Barracks update result:', { data: barracksData, error: barracksError })

      if (barracksError) {
        console.error('❌ Error updating barracks items:', barracksError)
        return NextResponse.json({ error: 'Failed to update shipping information' }, { status: 500 })
      }
      
      console.log('✅ Barracks items updated successfully')
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
