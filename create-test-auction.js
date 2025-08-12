// Create Test Auction
// This script creates a test auction with buy now functionality

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestAuction() {
  console.log('🧪 Creating Test Auction...\n')

  // Create a test auction that ends in 5 minutes
  const now = new Date()
  const endsAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now

  const testAuction = {
    experience_id: 'test_experience',
    created_by_user_id: 'test_seller',
    title: '🧪 TEST: Digital Product - Buy Now Available',
    description: 'This is a test auction to verify the complete payment flow. You can bid or use buy now!',
    images: ['https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Test+Product'],
    type: 'DIGITAL',
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    anti_snipe_sec: 120,
    buy_now_price_cents: 2500, // $25 buy now price
    start_price_cents: 1000, // $10 starting price
    min_increment_cents: 100,
    currency: 'usd',
    community_pct: 5,
    platform_pct: 3,
    status: 'LIVE',
    shipping_cost_cents: 0,
    digital_delivery_type: 'FILE',
    digital_file_path: 'test-file.zip',
    digital_instructions: 'Download the test file after payment confirmation.'
  }

  console.log('Creating auction with these details:')
  console.log(`- Title: ${testAuction.title}`)
  console.log(`- Type: ${testAuction.type}`)
  console.log(`- Start Price: $${testAuction.start_price_cents/100}`)
  console.log(`- Buy Now Price: $${testAuction.buy_now_price_cents/100}`)
  console.log(`- Ends At: ${testAuction.ends_at}`)

  const { data: auction, error } = await supabase
    .from('auctions')
    .insert(testAuction)
    .select()
    .single()

  if (error) {
    console.log('❌ Error creating auction:', error.message)
    return
  }

  console.log(`✅ Test auction created successfully!`)
  console.log(`- Auction ID: ${auction.id}`)
  console.log(`- Status: ${auction.status}`)
  console.log(`- Ends in: 5 minutes`)

  console.log('\n🎯 Next Steps:')
  console.log('1. Place some bids on the auction')
  console.log('2. Try the buy now feature')
  console.log('3. Wait for auction to end (or manually trigger finalize-auctions)')
  console.log('4. Check if items appear in barracks')

  return auction
}

// Run the test
createTestAuction().catch(console.error)
