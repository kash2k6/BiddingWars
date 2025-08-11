import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Supabase Edge Function with test data...')
    
    // Create a test auction that ends in 1 minute
    const endsAt = new Date()
    endsAt.setMinutes(endsAt.getMinutes() + 1) // Ends in 1 minute
    
    const { data: testAuction, error: createError } = await supabaseServer
      .from('auctions')
      .insert({
        title: '🧪 Test Auction for Supabase Cron',
        description: 'This auction is created to test the Supabase Edge Function',
        starting_price_cents: 100, // $1.00
        current_price_cents: 100,
        buy_now_price_cents: 500, // $5.00
        status: 'LIVE',
        experience_id: 'exp_hxtkjfMPOH3rWW',
        creator_user_id: 'test-user-123',
        ends_at: endsAt.toISOString(),
        platform_pct: 3,
        community_pct: 5,
        product_type: 'PHYSICAL',
        shipping_cost_cents: 200 // $2.00 shipping
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating test auction:', createError)
      return NextResponse.json({ error: 'Failed to create test auction' }, { status: 500 })
    }

    console.log('✅ Test auction created:', testAuction.id)

    // Create a test bid
    const { data: testBid, error: bidError } = await supabaseServer
      .from('bids')
      .insert({
        auction_id: testAuction.id,
        bidder_user_id: 'test-bidder-123',
        amount_cents: 150, // $1.50 bid
        experience_id: 'exp_hxtkjfMPOH3rWW'
      })
      .select()
      .single()

    if (bidError) {
      console.error('Error creating test bid:', bidError)
      return NextResponse.json({ error: 'Failed to create test bid' }, { status: 500 })
    }

    console.log('✅ Test bid created:', testBid.id)

    // Test the Supabase Edge Function
    const edgeFunctionUrl = `https://fdvzkpucafqkguglqgpu.supabase.co/functions/v1/finalize-auctions`
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const edgeFunctionResult = await response.json()
    console.log('Edge Function result:', edgeFunctionResult)

    return NextResponse.json({
      success: true,
      message: 'Test auction and bid created successfully!',
      testAuction: {
        id: testAuction.id,
        title: testAuction.title,
        endsAt: testAuction.ends_at,
        status: testAuction.status
      },
      testBid: {
        id: testBid.id,
        amount: testBid.amount_cents,
        bidder: testBid.bidder_user_id
      },
      edgeFunctionResult,
      instructions: [
        '1. Wait 1 minute for the auction to end',
        '2. Call the Supabase Edge Function again',
        '3. Check if the auction status changes to PENDING_PAYMENT'
      ]
    })

  } catch (error) {
    console.error('❌ Test Supabase cron failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
