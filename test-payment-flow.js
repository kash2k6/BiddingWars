// Test Payment Flow Script
// Run this to test the complete barracks system

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPaymentFlow() {
  console.log('🧪 Testing Payment Flow...\n')

  // 1. Check if barracks tables exist
  console.log('1. Checking barracks system tables...')
  try {
    const { data: barracksItems, error } = await supabase
      .from('barracks_items')
      .select('*')
      .limit(1)
    
    if (error && error.code === '42P01') {
      console.log('❌ barracks_items table does not exist. Please run barracks-system.sql first!')
      return
    }
    console.log('✅ barracks_items table exists')
  } catch (error) {
    console.log('❌ Error checking barracks_items table:', error.message)
    return
  }

  // 2. Check existing auctions
  console.log('\n2. Checking existing auctions...')
  const { data: auctions, error: auctionsError } = await supabase
    .from('auctions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (auctionsError) {
    console.log('❌ Error fetching auctions:', auctionsError.message)
    return
  }

  console.log(`Found ${auctions.length} auctions:`)
  auctions.forEach(auction => {
    console.log(`  - ${auction.title} (${auction.status}) - Ends: ${auction.ends_at}`)
  })

  // 3. Check for auctions that can be ended
  console.log('\n3. Looking for auctions to end...')
  const now = new Date().toISOString()
  const { data: endedAuctions, error: endedError } = await supabase
    .from('auctions')
    .select('*')
    .eq('status', 'LIVE')
    .lt('ends_at', now)

  if (endedError) {
    console.log('❌ Error checking ended auctions:', endedError.message)
    return
  }

  console.log(`Found ${endedAuctions.length} auctions that should be ended:`)
  endedAuctions.forEach(auction => {
    console.log(`  - ${auction.title} (ended at ${auction.ends_at})`)
  })

  // 4. Check barracks items
  console.log('\n4. Checking barracks items...')
  const { data: barracksItems, error: barracksError } = await supabase
    .from('barracks_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (barracksError) {
    console.log('❌ Error fetching barracks items:', barracksError.message)
    return
  }

  console.log(`Found ${barracksItems.length} barracks items:`)
  barracksItems.forEach(item => {
    console.log(`  - Item ${item.id} (${item.status}) - Amount: $${item.amount_cents/100}`)
  })

  // 5. Check winning bids
  console.log('\n5. Checking winning bids...')
  const { data: winningBids, error: winningError } = await supabase
    .from('winning_bids')
    .select('*')
    .order('created_at', { ascending: false })

  if (winningError) {
    console.log('❌ Error fetching winning bids:', winningError.message)
    return
  }

  console.log(`Found ${winningBids.length} winning bids:`)
  winningBids.forEach(bid => {
    console.log(`  - Auction ${bid.auction_id} - User: ${bid.user_id} - Amount: $${bid.amount_cents/100}`)
  })

  console.log('\n🎯 Next Steps:')
  console.log('1. If barracks tables don\'t exist, run barracks-system.sql')
  console.log('2. Create a test auction with a short end time')
  console.log('3. Place some bids')
  console.log('4. Wait for auction to end (or manually trigger finalize-auctions)')
  console.log('5. Check if items appear in barracks')
  console.log('6. Test payment verification')
}

// Run the test
testPaymentFlow().catch(console.error)
