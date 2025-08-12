// Create Test Bids
// This script places test bids on the auction

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestBids() {
  console.log('🧪 Creating Test Bids...\n')

  // Find the test auction
  const { data: auctions, error: fetchError } = await supabase
    .from('auctions')
    .select('*')
    .eq('title', '🧪 TEST: Digital Product - Buy Now Available')
    .eq('status', 'LIVE')
    .order('created_at', { ascending: false })
    .limit(1)

  if (fetchError) {
    console.log('❌ Error fetching auctions:', fetchError.message)
    return
  }

  if (auctions.length === 0) {
    console.log('❌ No test auction found. Run create-test-auction.js first.')
    return
  }

  const auction = auctions[0]
  console.log(`Found test auction: ${auction.title} (ID: ${auction.id})`)

  // Create test bids
  const testBids = [
    {
      auction_id: auction.id,
      bidder_user_id: 'test_bidder_1',
      amount_cents: 1200 // $12
    },
    {
      auction_id: auction.id,
      bidder_user_id: 'test_bidder_2', 
      amount_cents: 1500 // $15
    },
    {
      auction_id: auction.id,
      bidder_user_id: 'test_bidder_3',
      amount_cents: 1800 // $18
    }
  ]

  console.log('Placing test bids:')
  for (const bid of testBids) {
    console.log(`- ${bid.bidder_user_id}: $${bid.amount_cents/100}`)
  }

  let bidCount = 0
  for (const bid of testBids) {
    const { data: createdBid, error } = await supabase
      .from('bids')
      .insert(bid)
      .select()
      .single()

    if (error) {
      console.log(`❌ Error creating bid for ${bid.bidder_user_id}:`, error.message)
      continue
    }

    console.log(`✅ Bid created: ${bid.bidder_user_id} - $${bid.amount_cents/100}`)
    bidCount++
  }

  console.log(`\n🎉 ${bidCount} test bids created successfully!`)
  console.log('\n📋 Current auction status:')
  console.log(`- Highest bid: $${Math.max(...testBids.map(b => b.amount_cents))/100}`)
  console.log(`- Buy now price: $${auction.buy_now_price_cents/100}`)
  console.log(`- Ends at: ${auction.ends_at}`)

  console.log('\n🎯 Next Steps:')
  console.log('1. Test buy now functionality')
  console.log('2. Wait for auction to end')
  console.log('3. Check finalize-auctions cron job')
  console.log('4. Verify items appear in barracks')
}

// Run the test
createTestBids().catch(console.error)
