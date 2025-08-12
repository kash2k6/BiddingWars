import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { barracksItemId } = await request.json()
    
    console.log('🔍 Manual payment verification for item:', barracksItemId)
    
    // Get the barracks item
    const { data: barracksItem, error: fetchError } = await supabaseServer
      .from('barracks_items')
      .select('*, auction:auction_id(*)')
      .eq('id', barracksItemId)
      .single()

    if (fetchError || !barracksItem) {
      console.error('Error fetching barracks item:', fetchError)
      return NextResponse.json({ error: 'Barracks item not found' }, { status: 404 })
    }

    console.log('Found barracks item:', {
      id: barracksItem.id,
      status: barracksItem.status,
      payment_id: barracksItem.payment_id,
      plan_id: barracksItem.plan_id,
      user_id: barracksItem.user_id
    })

    // Use Whop V5 API to check payment status by plan ID
    console.log('🔍 Checking payment status for plan:', barracksItem.plan_id)
    
    try {
      // Step 1: List payments for this plan ID
      const listResponse = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${barracksItem.plan_id}&in_app_payments=true`, {
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!listResponse.ok) {
        console.error(`Failed to list payments for plan ${barracksItem.plan_id}: ${listResponse.status}`)
        return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
      }

      const listData = await listResponse.json()
      console.log(`Found ${listData.data?.length || 0} payments for plan ${barracksItem.plan_id}`)

      // Step 2: Check if any payment is successful
      let successfulPayment = null
      for (const payment of listData.data || []) {
        if (payment.status === 'paid' && payment.paid_at && !payment.refunded_at) {
          successfulPayment = payment
          break
        }
      }

      if (!successfulPayment) {
        return NextResponse.json({ 
          error: 'No successful payment found for this plan' 
        }, { status: 400 })
      }

      console.log(`✅ Found successful payment: ${successfulPayment.id}`)
    
      // Update barracks item status
      const { error: updateError } = await supabaseServer
        .from('barracks_items')
        .update({
          status: 'PAID',
          paid_at: new Date(successfulPayment.paid_at * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', barracksItem.id)

    if (updateError) {
      console.error('Error updating barracks item:', updateError)
      return NextResponse.json({ error: 'Failed to update barracks item' }, { status: 500 })
    }

    // Update auction status
    const { error: auctionError } = await supabaseServer
      .from('auctions')
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString()
      })
      .eq('id', barracksItem.auction_id)

    if (auctionError) {
      console.error('Error updating auction:', auctionError)
      return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 })
    }

    // Create winning bid record
    const { error: winningBidError } = await supabaseServer
      .from('winning_bids')
              .insert({
          auction_id: barracksItem.auction_id,
          user_id: barracksItem.user_id,
          bid_id: barracksItem.auction?.current_bid_id,
          amount_cents: barracksItem.amount_cents,
          payment_processed: true,
          payment_id: successfulPayment.id
        })
      .single()

    if (winningBidError) {
      console.error('Error creating winning bid:', winningBidError)
      return NextResponse.json({ error: 'Failed to create winning bid' }, { status: 500 })
    }

    console.log('✅ Payment verification completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment verified and item marked as PAID',
      barracksItem: {
        id: barracksItem.id,
        status: 'PAID',
        paid_at: new Date().toISOString()
      }
    })

      } catch (error) {
      console.error('Error in manual payment verification:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in manual payment verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
