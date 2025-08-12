import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { barracksItemId, paymentId, planId } = await request.json()

    console.log('Updating barracks item payment info:', { barracksItemId, paymentId, planId })

    if (!barracksItemId || !paymentId || !planId) {
      return NextResponse.json({ 
        error: "Missing required fields: barracksItemId, paymentId, planId" 
      }, { status: 400 })
    }

    // Update the barracks item with payment information
    const { data, error } = await supabaseServer
      .from('barracks_items')
      .update({
        payment_id: paymentId,
        plan_id: planId,
        updated_at: new Date().toISOString()
      })
      .eq('id', barracksItemId)
      .select()
      .single()

    if (error) {
      console.error('Error updating barracks item:', error)
      return NextResponse.json({ 
        error: "Failed to update barracks item",
        details: error.message 
      }, { status: 500 })
    }

    console.log('Successfully updated barracks item:', data)

    return NextResponse.json({ 
      success: true, 
      barracksItem: data 
    })

  } catch (error) {
    console.error('Error in update-payment-info:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
