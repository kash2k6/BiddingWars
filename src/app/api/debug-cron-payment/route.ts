import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')
    const userId = searchParams.get('userId')
    
    console.log('🔍 Debugging cron payment for:', { planId, userId })
    
    // Get barracks items with this plan_id
    const { data: barracksItems, error: barracksError } = await supabaseServer
      .from('barracks_items')
      .select(`
        *,
        auction:auction_id(*)
      `)
      .eq('plan_id', planId)
      .eq('user_id', userId)

    if (barracksError) {
      console.error('❌ Error fetching barracks items:', barracksError)
      return NextResponse.json({ 
        success: false, 
        error: barracksError.message 
      }, { status: 500 })
    }

    console.log('📦 Barracks items found:', barracksItems?.length || 0)
    
    if (barracksItems && barracksItems.length > 0) {
      for (const item of barracksItems) {
        console.log('📦 Item details:', {
          id: item.id,
          status: item.status,
          amount_cents: item.amount_cents,
          plan_id: item.plan_id,
          user_id: item.user_id,
          auction_id: item.auction_id,
          auction_title: item.auction?.title,
          auction_shipping_cost: item.auction?.shipping_cost_cents
        })
        
        // Calculate total amount
        const shippingCost = item.auction?.shipping_cost_cents || 0
        const totalAmount = item.amount_cents + shippingCost
        const totalAmountDollars = totalAmount / 100
        
        console.log(`💰 Total amount calculation: $${item.amount_cents / 100} + $${shippingCost / 100} = $${totalAmountDollars}`)
      }
    }

    // Get payments from Whop API
    try {
      const paymentResponse = await fetch(`https://api.whop.com/v5/app/payments?user_id=${userId}&in_app_payments=true`, {
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!paymentResponse.ok) {
        console.error(`❌ Failed to fetch payments: ${paymentResponse.status}`)
        return NextResponse.json({
          success: false,
          error: `Failed to fetch payments: ${paymentResponse.status}`,
          barracksItems: barracksItems || []
        })
      }

      const paymentsData = await paymentResponse.json()
      console.log(`📊 Found ${paymentsData.data?.length || 0} total payments for user ${userId}`)

      // Filter payments by plan_id
      const planPayments = paymentsData.data?.filter((p: any) => p.plan_id === planId) || []
      console.log(`📊 Found ${planPayments.length} payments for plan ${planId}`)

      if (planPayments.length > 0) {
        for (const payment of planPayments) {
          console.log('💳 Payment details:', {
            id: payment.id,
            plan_id: payment.plan_id,
            user_id: payment.user_id,
            final_amount: payment.final_amount,
            status: payment.status,
            paid_at: payment.paid_at,
            refunded_at: payment.refunded_at
          })
        }
      }

      return NextResponse.json({
        success: true,
        barracksItems: barracksItems || [],
        payments: planPayments,
        totalPayments: paymentsData.data?.length || 0
      })

    } catch (apiError) {
      console.error('❌ Error fetching payments from Whop API:', apiError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch payments from Whop API',
        barracksItems: barracksItems || []
      })
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
