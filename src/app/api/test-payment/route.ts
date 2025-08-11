import { NextRequest, NextResponse } from 'next/server'
import { WhopServerSdk } from '@whop/api'
import { calculateCommissionBreakdown, processPayouts } from '@/lib/payment-system'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing complete auction payment flow...')
    
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Testing complete payment flow for user:', userId)

    // Create Whop SDK instance for the user
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
      onBehalfOfUserId: userId
    })

    console.log('✅ Whop SDK initialized successfully')

    // Simulate auction payment (1 cent = $0.01)
    const auctionAmount = 1 // 1 cent
    const breakdown = calculateCommissionBreakdown(auctionAmount, 3, 5) // 3% platform, 5% community

    console.log('💰 Commission breakdown:', breakdown)

    // Try to create a small test charge
    const chargeResult = await whopSdk.payments.chargeUser({
      amount: auctionAmount,
      currency: 'usd' as any,
      userId: userId,
      description: 'Test auction payment for BiddingWars integration',
      metadata: {
        test: true,
        auctionId: 'test-auction-123',
        experienceId: 'exp_hxtkjfMPOH3rWW',
        platformPct: 3,
        communityPct: 5,
        sellerUserId: 'test-seller-123',
        winnerUserId: userId,
        timestamp: Date.now(),
        app: 'BiddingWars'
      }
    })

    console.log('✅ Charge created successfully:', chargeResult)

    // If payment is successful, simulate payouts
    if (chargeResult && chargeResult.status === 'success') {
      console.log('🔄 Simulating payouts...')
      
      try {
        // Simulate paying community owner and seller
        const payoutResult = await processPayouts(
          'test-auction-123',
          breakdown,
          'test-community-owner-123', // Community owner
          'test-seller-123', // Seller
          'exp_hxtkjfMPOH3rWW'
        )

        console.log('✅ Payouts processed:', payoutResult)

        return NextResponse.json({
          success: true,
          message: 'Complete auction payment flow successful!',
          chargeResult,
          breakdown,
          payoutResult,
          testDetails: {
            auctionAmount,
            platformFee: breakdown.platformFee,
            communityFee: breakdown.communityFee,
            sellerAmount: breakdown.sellerAmount,
            currency: breakdown.currency
          }
        })
      } catch (payoutError) {
        console.error('❌ Payout simulation failed:', payoutError)
        
        return NextResponse.json({
          success: true,
          message: 'Payment successful, but payout simulation failed',
          chargeResult,
          breakdown,
          payoutError: payoutError instanceof Error ? payoutError.message : 'Unknown payout error',
          testDetails: {
            auctionAmount,
            platformFee: breakdown.platformFee,
            communityFee: breakdown.communityFee,
            sellerAmount: breakdown.sellerAmount,
            currency: breakdown.currency
          }
        })
      }
    } else {
      return NextResponse.json({
        success: true,
        message: 'Payment created, needs user action',
        chargeResult,
        breakdown,
        testDetails: {
          auctionAmount,
          platformFee: breakdown.platformFee,
          communityFee: breakdown.communityFee,
          sellerAmount: breakdown.sellerAmount,
          currency: breakdown.currency
        }
      })
    }

  } catch (error) {
    console.error('❌ Complete payment flow test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}
