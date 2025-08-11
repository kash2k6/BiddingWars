export interface PayoutBreakdown {
  platformFee: number
  communityFee: number
  sellerAmount: number
  total: number
}

export function calculatePayouts(
  saleAmountCents: number,
  platformPct: number = 3,
  communityPct: number
): PayoutBreakdown {
  const platformFee = Math.floor(saleAmountCents * platformPct / 100)
  const communityFee = Math.floor(saleAmountCents * communityPct / 100)
  const sellerAmount = saleAmountCents - platformFee - communityFee

  return {
    platformFee,
    communityFee,
    sellerAmount,
    total: saleAmountCents
  }
}

export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amountCents / 100)
}

export function calculateShippingCost(auction: any): number {
  return auction.shipping_cost_cents || 0
}

export function calculateTotalWithShipping(bidAmount: number, shippingCost: number): number {
  return bidAmount + shippingCost
}
