import { whopSdk } from '@/lib/whop';

export interface PayoutCalculation {
  totalAmount: number;
  platformFee: number;
  sellerAmount: number;
  communityOwnerAmount: number;
  businessRevenue: number;
}

export interface PayoutRequest {
  auctionId: string;
  experienceId: string;
  sellerUserId: string;
  communityOwnerUserId: string;
  totalAmount: number;
  currency?: string;
}

/**
 * Calculate payout distribution based on the business model:
 * - $1 flat fee for items under $50
 * - $1 + 3% for items $50 and over
 * - Pay seller (auction creator)
 * - Pay community owner (experience owner)
 * - Keep remainder as business revenue
 */
export function calculatePayoutDistribution(totalAmount: number): PayoutCalculation {
  // Calculate platform fee
  let platformFee: number;
  if (totalAmount < 50) {
    platformFee = 1; // $1 flat fee for items under $50
  } else {
    platformFee = 1 + (totalAmount * 0.03); // $1 + 3% for items $50+
  }

  // Calculate distribution after platform fee:
  // - Platform fee goes to business ledger
  // - Community owner gets their share (let's say 10% of net amount)
  // - Seller gets the rest
  const communityOwnerPercentage = 0.10; // 10% to community owner
  const netAfterPlatformFee = totalAmount - platformFee;
  
  const communityOwnerAmount = netAfterPlatformFee * communityOwnerPercentage;
  const sellerAmount = netAfterPlatformFee - communityOwnerAmount; // Rest goes to seller
  const businessRevenue = platformFee; // Platform fee stays in business ledger

  return {
    totalAmount,
    platformFee,
    sellerAmount,
    communityOwnerAmount,
    businessRevenue
  };
}

/**
 * Execute payouts to seller and community owner using Whop's payUser API
 */
export async function executePayouts(payoutRequest: PayoutRequest): Promise<{
  success: boolean;
  sellerPayout?: any;
  communityOwnerPayout?: any;
  errors: string[];
}> {
  const { auctionId, experienceId, sellerUserId, communityOwnerUserId, totalAmount, currency = 'usd' } = payoutRequest;
  
  const calculation = calculatePayoutDistribution(totalAmount);
  const errors: string[] = [];

  try {
    // Get the experience to find the company/ledger account
    const experience = await whopSdk.experiences.getExperience({ experienceId });
    const companyId = experience.company.id;
    
    // Get the company's ledger account
    const ledgerAccount = await whopSdk.companies.getCompanyLedgerAccount({ companyId });
    const ledgerAccountId = ledgerAccount.company?.ledgerAccount.id;

    if (!ledgerAccountId) {
      throw new Error('Could not find ledger account for company');
    }

    const payouts: any = {};

    // Pay the seller
    if (calculation.sellerAmount > 0) {
      try {
        const sellerPayout = await whopSdk.payments.payUser({
          amount: Math.round(calculation.sellerAmount * 100), // Convert to cents
          currency: currency as any,
          destinationId: sellerUserId,
          ledgerAccountId: ledgerAccountId,
          idempotenceKey: `seller_payout_${auctionId}_${Date.now()}`,
          reason: 'creator_to_creator' as any,
          notes: `Auction payout for ${auctionId}`,
          transferFee: ledgerAccount.company?.ledgerAccount.transferFee || 0
        });
        
        payouts.sellerPayout = sellerPayout;
        console.log(`✅ Paid seller ${sellerUserId}: $${calculation.sellerAmount}`);
      } catch (error) {
        const errorMsg = `Failed to pay seller: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    // Pay the community owner
    if (calculation.communityOwnerAmount > 0) {
      try {
        const communityOwnerPayout = await whopSdk.payments.payUser({
          amount: Math.round(calculation.communityOwnerAmount * 100), // Convert to cents
          currency: currency as any,
          destinationId: communityOwnerUserId,
          ledgerAccountId: ledgerAccountId,
          idempotenceKey: `community_payout_${auctionId}_${Date.now()}`,
          reason: 'creator_to_creator' as any,
          notes: `Community owner payout for auction ${auctionId}`,
          transferFee: ledgerAccount.company?.ledgerAccount.transferFee || 0
        });
        
        payouts.communityOwnerPayout = communityOwnerPayout;
        console.log(`✅ Paid community owner ${communityOwnerUserId}: $${calculation.communityOwnerAmount}`);
      } catch (error) {
        const errorMsg = `Failed to pay community owner: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      sellerPayout: payouts.sellerPayout,
      communityOwnerPayout: payouts.communityOwnerPayout,
      errors
    };

  } catch (error) {
    const errorMsg = `Payout execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error(errorMsg, error);
    
    return {
      success: false,
      errors
    };
  }
}

/**
 * Get payout calculation for display purposes
 */
export function getPayoutBreakdown(totalAmount: number): PayoutCalculation {
  return calculatePayoutDistribution(totalAmount);
}

/**
 * Format currency amount (in cents) to display string
 */
export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amountCents / 100);
}
