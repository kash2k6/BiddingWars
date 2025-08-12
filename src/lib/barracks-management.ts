import { createClient } from '@/lib/supabase-client'

export interface BarracksItem {
  id: string
  auction_id: string
  user_id: string
  plan_id: string
  status: 'PENDING_PAYMENT' | 'PAID' | 'FULFILLED'
  amount_cents: number
  created_at: string
  paid_at?: string
  fulfilled_at?: string
}

/**
 * Add an item to user's barracks (for Buy Now purchases)
 */
export async function addToBarracks(
  auctionId: string,
  userId: string,
  planId: string,
  amountCents: number,
  status: 'PENDING_PAYMENT' | 'PAID' = 'PENDING_PAYMENT'
) {
  const supabase = createClient()
  
  const barracksItem = {
    auction_id: auctionId,
    user_id: userId,
    plan_id: planId,
    status: status,
    amount_cents: amountCents,
    created_at: new Date().toISOString(),
    paid_at: status === 'PAID' ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from('barracks_items')
    .insert(barracksItem)
    .select()
    .single()

  if (error) {
    console.error('Error adding item to barracks:', error)
    throw error
  }

  return data
}

/**
 * Update barracks item status (e.g., from PENDING_PAYMENT to PAID)
 */
export async function updateBarracksItemStatus(
  planId: string,
  userId: string,
  status: 'PENDING_PAYMENT' | 'PAID' | 'FULFILLED'
) {
  const supabase = createClient()
  
  const updateData: any = {
    status: status,
    updated_at: new Date().toISOString()
  }

  if (status === 'PAID') {
    updateData.paid_at = new Date().toISOString()
  } else if (status === 'FULFILLED') {
    updateData.fulfilled_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('barracks_items')
    .update(updateData)
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating barracks item:', error)
    throw error
  }

  return data
}

/**
 * Remove auction from marketplace once user has access
 */
export async function removeAuctionFromMarketplace(auctionId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('auctions')
    .update({
      status: 'REMOVED',
      updated_at: new Date().toISOString()
    })
    .eq('id', auctionId)

  if (error) {
    console.error('Error removing auction from marketplace:', error)
    throw error
  }

  return true
}

/**
 * Get user's barracks items
 */
export async function getUserBarracksItems(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barracks_items')
    .select(`
      *,
      auction:auction_id(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching barracks items:', error)
    throw error
  }

  return data
}

/**
 * Check if user has access to a specific plan
 */
export async function checkUserPlanAccess(userId: string, planId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barracks_items')
    .select('status')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('status', 'PAID')
    .single()

  if (error) {
    return false
  }

  return !!data
}

/**
 * Get barracks item by plan ID (for claiming specific items)
 */
export async function getBarracksItemByPlanId(planId: string, userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barracks_items')
    .select(`
      *,
      auction:auction_id(*)
    `)
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching barracks item:', error)
    return null
  }

  return data
}
