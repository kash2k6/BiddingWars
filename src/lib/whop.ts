import { WhopServerSdk } from '@whop/api'

// Server-side Whop SDK instance
export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
  appApiKey: process.env.WHOP_API_KEY!,
  onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
})

// Client-side Whop SDK instance (for user-specific operations)
export function createWhopClient(userId: string, companyId?: string) {
  return WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
    appApiKey: process.env.WHOP_API_KEY!,
    onBehalfOfUserId: userId,
    companyId,
  })
}

// Types for Whop responses
export interface WhopUser {
  id: string
  username: string
  name: string
  email: string
}

export interface WhopLedgerAccount {
  id: string
  transferFee: number
  balanceCaches: {
    nodes: Array<{
      balance: number
      pendingBalance: number
      currency: string
    }>
  }
}

export interface WhopInAppPurchase {
  id: string
  planId: string
  amount: number
  currency: string
  metadata?: Record<string, any>
}

export interface WhopPaymentResult {
  status: 'ok' | 'error'
  data?: {
    receipt_id: string
  }
  error?: string
}
