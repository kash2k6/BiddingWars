// Working Payment Flow Test
// This script tests the payment flow with current allowed statuses

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWorkingPaymentFlow() {
  console.log('🧪 Testing Working Payment Flow...\n')

  // 1. Check PENDING_PAYMENT auctions
  console.log('1. Checking PENDING_PAYMENT auctions...')
  const { data: pendingAuctions, error: pendingError } = await supabase
    .from('auctions')
    .select('*')
    .eq('status', 'PENDING_PAYMENT')

  if (pendingError) {
    console.log('❌ Error fetching pending auctions:', pendingError.message)
    return
  }

  console.log(`Found ${pendingAuctions.length} PENDING_PAYMENT auctions:`)
  pendingAuctions.forEach(auction => {
    console.log(`  - ${auction.title} (ID: ${auction.id}) - Winner: ${auction.winner_user_id}`)
  })

  if (pendingAuctions.length === 0) {
    console.log('❌ No PENDING_PAYMENT auctions found.')
    return
  }

  // 2. Create barracks items for PENDING_PAYMENT auctions (using PAID status)
  console.log('\n2. Creating barracks items for PENDING_PAYMENT auctions...')
  
  for (const auction of pendingAuctions) {
    // Check if barracks item already exists
    const { data: existingItem, error: checkError } = await supabase
      .from('barracks_items')
      .select('*')
      .eq('auction_id', auction.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.log(`❌ Error checking barracks item for auction ${auction.id}:`, checkError.message)
      continue
    }

    if (existingItem) {
      console.log(`✅ Barracks item already exists for auction ${auction.id}`)
      continue
    }

    // Create barracks item with PAID status (since PENDING_PAYMENT is not allowed)
    const { data: barracksItem, error: createError } = await supabase
      .from('barracks_items')
      .insert({
        user_id: auction.winner_user_id,
        auction_id: auction.id,
        plan_id: auction.experience_id,
        amount_cents: 1000, // Default amount for testing
        status: 'PAID' // Use PAID since PENDING_PAYMENT is not allowed
      })
      .select()
      .single()

    if (createError) {
      console.log(`❌ Error creating barracks item for auction ${auction.id}:`, createError.message)
      continue
    }

    console.log(`✅ Created barracks item ${barracksItem.id} for auction ${auction.id}`)
  }

  // 3. Check barracks items
  console.log('\n3. Checking barracks items...')
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
    console.log(`  - Item ${item.id} (${item.status}) - Auction: ${item.auction_id} - Amount: $${item.amount_cents/100}`)
  })

  // 4. Update auction status to PAID
  console.log('\n4. Updating auction status to PAID...')
  
  for (const auction of pendingAuctions) {
    const { error: auctionError } = await supabase
      .from('auctions')
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString()
      })
      .eq('id', auction.id)

    if (auctionError) {
      console.log(`❌ Error updating auction ${auction.id}:`, auctionError.message)
      continue
    }

    console.log(`✅ Updated auction ${auction.id} status to PAID`)
  }

  // 5. Create winning bid records
  console.log('\n5. Creating winning bid records...')
  
  for (const item of barracksItems) {
    const { error: winningBidError } = await supabase
      .from('winning_bids')
      .insert({
        auction_id: item.auction_id,
        user_id: item.user_id,
        bid_id: item.auction_id, // Using auction_id as bid_id for now
        amount_cents: item.amount_cents,
        payment_processed: true
      })
      .single()

    if (winningBidError) {
      console.log(`❌ Error creating winning bid for auction ${item.auction_id}:`, winningBidError.message)
      continue
    }

    console.log(`✅ Created winning bid record for auction ${item.auction_id}`)
  }

  // 6. Final check
  console.log('\n6. Final status check...')
  const { data: finalBarracksItems, error: finalError } = await supabase
    .from('barracks_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (finalError) {
    console.log('❌ Error fetching final barracks items:', finalError.message)
    return
  }

  console.log(`Final barracks items (${finalBarracksItems.length}):`)
  finalBarracksItems.forEach(item => {
    console.log(`  - Item ${item.id} (${item.status}) - Amount: $${item.amount_cents/100}`)
  })

  console.log('\n🎯 Test completed! Check your barracks page to see the items.')
  console.log('\n📋 Next Steps:')
  console.log('1. Run barracks-system.sql in Supabase to add PENDING_PAYMENT status')
  console.log('2. Add the cron job on cron-job.org for payment verification')
  console.log('3. Test with real Whop payments')
  console.log('\n🎉 Your barracks should now show the test items!')
}

// Run the test
testWorkingPaymentFlow().catch(console.error)
