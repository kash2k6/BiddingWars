import { whopSdk, createWhopClient } from './whop'

export interface PaymentRequest {
  userId: string
  amount: number // in cents
  currency: string
  description: string
  metadata: {
    auctionId: string
    experienceId: string
    platformPct: number
    communityPct: number
    sellerUserId: string
    winnerUserId: string
    [key: string]: any
  }
}

export interface PaymentResult {
  status: 'success' | 'needs_action' | 'failed'
  inAppPurchase?: {
    id: string
    planId: string
  }
  error?: string
}

export interface CommissionBreakdown {
  totalAmount: number
  platformFee: number
  communityFee: number
  sellerAmount: number
  currency: string
}

export interface PayoutRequest {
  userId: string
  amount: number
  currency: string
  description: string
  metadata: {
    auctionId: string
    experienceId: string
    type: 'community' | 'seller'
    [key: string]: any
  }
}

/**
 * Charge a user for winning an auction - money goes to company ledger
 */
export async function chargeUserForAuction(paymentRequest: PaymentRequest): Promise<PaymentResult> {
  try {
    console.log('Charging user for auction:', paymentRequest)

    // Get the experience to find the company ID
    const { WhopServerSdk } = await import('@whop/api')
    
    // Create a fresh SDK instance without onBehalfOfUserId to get experience details
    const experienceSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
    })
    
    const experience = await experienceSdk.experiences.getExperience({ 
      experienceId: paymentRequest.metadata.experienceId 
    })
    const companyId = experience.company.id

    console.log('Found company ID:', companyId)

    // Get your company's ledger account
    const ledgerAccount = await experienceSdk.companies.getCompanyLedgerAccount({
      companyId,
    })

    console.log('Company ledger account:', ledgerAccount)

    if (!ledgerAccount || !ledgerAccount.ledgerAccount?.id) {
      throw new Error('No ledger account found for company')
    }

    // Create a Whop SDK instance for the specific user
    const userSdk = createWhopClient(paymentRequest.userId)

    // Charge the user - money goes to YOUR company's ledger account
    const result = await userSdk.payments.chargeUser({
      amount: paymentRequest.amount,
      currency: paymentRequest.currency as any,
      userId: paymentRequest.userId,
      description: paymentRequest.description,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bidding-wars-cyowxb5ih-kash2k6s-projects.vercel.app'}/experiences/${paymentRequest.metadata.experienceId}?payment_success=true&type=payment&auctionId=${paymentRequest.metadata.auctionId}`,
      metadata: paymentRequest.metadata,
    })

    console.log('Charge user result:', result)

    if (!result) {
      return {
        status: 'failed',
        error: 'No result from payment API'
      }
    }

    if (result.status === 'success') {
      return {
        status: 'success',
        inAppPurchase: result.inAppPurchase || undefined
      }
    } else if (result.status === 'needs_action' && result.inAppPurchase) {
      return {
        status: 'needs_action',
        inAppPurchase: result.inAppPurchase
      }
    } else {
      return {
        status: 'failed',
        error: 'Payment failed'
      }
    }
  } catch (error) {
    console.error('Error charging user:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Calculate commission breakdown for an auction
 */
export function calculateCommissionBreakdown(
  totalAmount: number,
  platformPct: number = 3,
  communityPct: number = 5
): CommissionBreakdown {
  const platformFee = Math.floor(totalAmount * (platformPct / 100))
  const communityFee = Math.floor(totalAmount * (communityPct / 100))
  const sellerAmount = totalAmount - platformFee - communityFee

  return {
    totalAmount,
    platformFee,
    communityFee,
    sellerAmount,
    currency: 'usd'
  }
}

/**
 * Pay out commissions to community owner and seller
 */
export async function processPayouts(
  auctionId: string,
  breakdown: CommissionBreakdown,
  communityUserId: string,
  sellerUserId: string,
  experienceId: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []
  const payouts: PayoutRequest[] = []

  // Add community payout
  if (breakdown.communityFee > 0) {
    payouts.push({
      userId: communityUserId,
      amount: breakdown.communityFee,
      currency: breakdown.currency,
      description: `Community commission for auction ${auctionId}`,
      metadata: {
        auctionId,
        experienceId,
        type: 'community'
      }
    })
  }

  // Add seller payout
  if (breakdown.sellerAmount > 0) {
    payouts.push({
      userId: sellerUserId,
      amount: breakdown.sellerAmount,
      currency: breakdown.currency,
      description: `Seller payout for auction ${auctionId}`,
      metadata: {
        auctionId,
        experienceId,
        type: 'seller'
      }
    })
  }

  // Process all payouts
  for (const payout of payouts) {
    try {
      await payUser(payout)
      console.log(`Successfully paid ${payout.amount} to ${payout.userId} for ${payout.metadata.type}`)
    } catch (error) {
      const errorMsg = `Failed to pay ${payout.amount} to ${payout.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}

/**
 * Pay a user using Whop SDK (following official documentation pattern)
 */
export async function payUser(payoutRequest: PayoutRequest): Promise<void> {
  try {
    console.log('Paying user:', payoutRequest)

    // Get the experience to find the company ID
    const { WhopServerSdk } = await import('@whop/api')
    
    // Create a fresh SDK instance without onBehalfOfUserId to get experience details
    const experienceSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
    })
    
    const experience = await experienceSdk.experiences.getExperience({ 
      experienceId: payoutRequest.metadata.experienceId 
    })
    const companyId = experience.company.id

    console.log('Found company ID:', companyId)

    // Get your company's ledger account
    const ledgerAccount = await experienceSdk.companies.getCompanyLedgerAccount({
      companyId,
    })

    console.log('Ledger account:', ledgerAccount)

    if (!ledgerAccount || !ledgerAccount.ledgerAccount?.id) {
      throw new Error('No ledger account found for company')
    }

    // Pay the recipient using the Pay User API
    await experienceSdk.payments.payUser({
      amount: payoutRequest.amount,
      currency: payoutRequest.currency as any,
      // The ID of the destination (either a User tag, Bot tag, or LedgerAccount tag)
      destinationId: payoutRequest.userId,
      // The ledger account id to transfer from (your company's account)
      ledgerAccountId: ledgerAccount.ledgerAccount.id,
      // A unique key to ensure idempotence
      idempotenceKey: `payout_${payoutRequest.metadata.auctionId}_${payoutRequest.metadata.type}_${Date.now()}`,
      // Notes for the transfer (max 50 characters)
      notes: payoutRequest.description.substring(0, 50),
      // The reason for the transfer
      reason: 'user_to_creator' as any,
      // The fee that the client thinks it is being charged for the transfer
      transferFee: ledgerAccount.ledgerAccount.transferFee,
    })

    console.log('Pay user successful')
  } catch (error) {
    console.error('Error paying user:', error)
    throw error
  }
}

/**
 * Create a checkout session for in-app purchases
 */
export async function createCheckoutSession(planId: string, metadata?: any): Promise<{ id: string; planId: string }> {
  try {
    console.log('Creating checkout session for plan:', planId)

    const result = await whopSdk.payments.createCheckoutSession({
      planId,
      metadata,
    })

    console.log('Checkout session result:', result)

    if (!result) {
      throw new Error('No result from checkout session creation')
    }

    return {
      id: result.id,
      planId: result.planId
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Get payment receipts for a company (for admin/reporting)
 */
export async function getCompanyReceipts(
  companyId: string,
  options: {
    first?: number
    after?: string
    filter?: {
      statuses?: string[]
      currencies?: string[]
      startDate?: number
      endDate?: number
    }
  } = {}
): Promise<any> {
  try {
    console.log('Getting company receipts for:', companyId)

    // Return empty receipts for now
    const mockReceipts = {
      receipts: {
        nodes: [], // Empty array - no receipts to show
        pageInfo: {
          hasNextPage: false,
          endCursor: null
        }
      }
    }

    console.log('Returning empty receipts')

    return mockReceipts
  } catch (error) {
    console.error('Error getting company receipts:', error)
    throw error
  }
}
