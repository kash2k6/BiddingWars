import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    if (!itemId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing itemId parameter' 
      }, { status: 400 })
    }
    
    console.log('🧮 Testing payment calculation for item:', itemId)
    
    // Get barracks item
    const { data: item, error: itemError } = await supabaseServer
      .from('barracks_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError) {
      console.error('❌ Error fetching barracks item:', itemError)
      return NextResponse.json({ 
        success: false, 
        error: itemError.message
      }, { status: 500 })
    }

    // Get auction details to calculate total amount (bid + shipping)
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('shipping_cost_cents, title, type')
      .eq('id', item.auction_id)
      .single()

    if (auctionError) {
      console.error('❌ Error fetching auction:', auctionError)
      return NextResponse.json({ 
        success: false, 
        error: auctionError.message
      }, { status: 500 })
    }

    const shippingCostCents = auction.shipping_cost_cents || 0
    const totalAmountCents = item.amount_cents + shippingCostCents
    const totalAmountDollars = totalAmountCents / 100

    console.log('✅ Calculation complete')
    
    return NextResponse.json({
      success: true,
      barracksItem: {
        id: item.id,
        user_id: item.user_id,
        plan_id: item.plan_id,
        amount_cents: item.amount_cents,
        status: item.status
      },
      auction: {
        id: item.auction_id,
        title: auction.title,
        type: auction.type,
        shipping_cost_cents: shippingCostCents
      },
      calculation: {
        bid_amount_dollars: item.amount_cents / 100,
        shipping_cost_dollars: shippingCostCents / 100,
        total_amount_dollars: totalAmountDollars,
        total_amount_cents: totalAmountCents
      }
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
