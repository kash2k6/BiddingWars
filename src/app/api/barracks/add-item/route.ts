import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { user_id, auction_id, plan_id, amount_cents, payment_id } = await request.json()

    if (!user_id || !auction_id || !plan_id || !amount_cents) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = supabaseServer

    // Add item to barracks
    const { data: barracksItem, error } = await supabase
      .from('barracks_items')
      .insert({
        user_id,
        auction_id,
        plan_id,
        amount_cents,
        payment_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding item to barracks:', error)
      return NextResponse.json(
        { error: 'Failed to add item to barracks' },
        { status: 500 }
      )
    }

    // Update auction status to PAID
    const { error: auctionError } = await supabase
      .from('auctions')
      .update({ 
        status: 'PAID',
        payment_id,
        winner_user_id: user_id
      })
      .eq('id', auction_id)

    if (auctionError) {
      console.error('Error updating auction status:', auctionError)
      return NextResponse.json(
        { error: 'Failed to update auction status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      barracks_item: barracksItem
    })

  } catch (error) {
    console.error('Error in add-item route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
