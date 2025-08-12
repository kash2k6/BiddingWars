import { NextRequest, NextResponse } from 'next/server';
import { executePayouts, PayoutRequest, calculatePayoutDistribution } from '@/lib/payouts';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { auctionId, experienceId } = await request.json();

    if (!auctionId || !experienceId) {
      return NextResponse.json(
        { error: 'Missing required fields: auctionId, experienceId' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer;

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        *,
        winning_bids!inner(*)
      `)
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Get the winning bid amount
    const winningBid = auction.winning_bids?.[0];
    if (!winningBid) {
      return NextResponse.json(
        { error: 'No winning bid found for this auction' },
        { status: 400 }
      );
    }

    // Get experience details to find community owner
    const { data: experience, error: experienceError } = await supabase
      .from('experiences')
      .select('*')
      .eq('id', experienceId)
      .single();

    if (experienceError || !experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    // Calculate total amount (winning bid amount in dollars)
    const totalAmount = winningBid.amount_cents / 100;

    // Calculate payout distribution
    const payoutCalculation = calculatePayoutDistribution(totalAmount);

    // Prepare payout request
    const payoutRequest: PayoutRequest = {
      auctionId,
      experienceId,
      sellerUserId: auction.created_by_user_id,
      communityOwnerUserId: experience.owner_user_id || auction.created_by_user_id, // Fallback to seller if no community owner
      totalAmount,
      currency: 'usd'
    };

    // Execute payouts
    const payoutResult = await executePayouts(payoutRequest);

    if (payoutResult.success) {
      // Update auction with payout information
      await supabase
        .from('auctions')
        .update({
          payout_status: 'COMPLETED',
          payout_completed_at: new Date().toISOString(),
          seller_payout_amount: payoutResult.sellerPayout ? payoutCalculation.sellerAmount : 0,
          community_payout_amount: payoutResult.communityOwnerPayout ? payoutCalculation.communityOwnerAmount : 0,
          platform_fee_amount: payoutCalculation.platformFee
        })
        .eq('id', auctionId);

      return NextResponse.json({
        success: true,
        message: 'Payouts executed successfully',
        sellerPayout: payoutResult.sellerPayout,
        communityOwnerPayout: payoutResult.communityOwnerPayout
      });
    } else {
      // Log errors and return failure
      console.error('Payout execution failed:', payoutResult.errors);
      
      // Update auction with failed status
      await supabase
        .from('auctions')
        .update({
          payout_status: 'FAILED',
          payout_error: payoutResult.errors.join(', ')
        })
        .eq('id', auctionId);

      return NextResponse.json({
        success: false,
        errors: payoutResult.errors
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Payout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
