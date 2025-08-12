// Test Buy Now
// This script tests the buy now functionality

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBuyNow() {
  console.log('🧪 Testing Buy Now Functionality...\n')

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
  console.log(`Buy now price: $${auction.buy_now_price_cents/100}`)

  // Simulate buy now purchase
  const buyNowUser = 'test_buy_now_user'
  const buyNowAmount = auction.buy_now_price_cents

  console.log(`\nSimulating buy now purchase by ${buyNowUser} for $${buyNowAmount/100}...`)

  // 1. Update auction status to PENDING_PAYMENT (simulating buy now)
  const { error: updateError } = await supabase
    .from('auctions')
    .update({
      status: 'PENDING_PAYMENT',
      winner_user_id: buyNowUser,
      updated_at: new Date().toISOString()
    })
    .eq('id', auction.id)

  if (updateError) {
    console.log('❌ Error updating auction status:', updateError.message)
    return
  }

  console.log('✅ Auction status updated to PENDING_PAYMENT')

  // 2. Create barracks item with PENDING_PAYMENT status
  const { data: barracksItem, error: barracksError } = await supabase
    .from('barracks_items')
    .insert({
      user_id: buyNowUser,
      auction_id: auction.id,
      plan_id: auction.experience_id,
      amount_cents: buyNowAmount,
      status: 'PENDING_PAYMENT',
      payment_id: `buy_now_payment_${auction.id}`
    })
    .select()
    .single()

  if (barracksError) {
    console.log('❌ Error creating barracks item:', barracksError.message)
    return
  }

  console.log(`✅ Created barracks item: ${barracksItem.id} (PENDING_PAYMENT)`)

  // 3. Create winning bid record (with NULL bid_id for buy now)
  const { data: winningBid, error: winningError } = await supabase
    .from('winning_bids')
    .insert({
      auction_id: auction.id,
      user_id: buyNowUser,
      bid_id: null, // NULL for buy now purchases
      amount_cents: buyNowAmount,
      payment_processed: false,
      payment_id: `buy_now_payment_${auction.id}`
    })
    .select()
    .single()

  if (winningError) {
    console.log('❌ Error creating winning bid:', winningError.message)
    return
  }

  console.log(`✅ Created winning bid record: ${winningBid.id} (NULL bid_id)`)

  // 4. Simulate payment verification (update to PAID)
  console.log('\nSimulating payment verification...')

  const { error: paymentError } = await supabase
    .from('barracks_items')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', barracksItem.id)

  if (paymentError) {
    console.log('❌ Error updating payment status:', paymentError.message)
    return
  }

  console.log('✅ Payment status updated to PAID')

  // 5. Update winning bid to payment processed
  const { error: winningUpdateError } = await supabase
    .from('winning_bids')
    .update({
      payment_processed: true
    })
    .eq('id', winningBid.id)

  if (winningUpdateError) {
    console.log('❌ Error updating winning bid:', winningUpdateError.message)
    return
  }

  console.log('✅ Winning bid updated to payment processed')

  // 6. Update auction status to PAID
  const { error: auctionPaidError } = await supabase
    .from('auctions')
    .update({
      status: 'PAID',
      updated_at: new Date().toISOString()
    })
    .eq('id', auction.id)

  if (auctionPaidError) {
    console.log('❌ Error updating auction to PAID:', auctionPaidError.message)
    return
  }

  console.log('✅ Auction status updated to PAID')

  // 7. Final verification
  console.log('\n📋 Final Status Check:')
  
  const { data: finalBarracksItems, error: finalError } = await supabase
    .from('barracks_items')
    .select('*')
    .eq('auction_id', auction.id)
    .order('created_at', { ascending: false })

  if (finalError) {
    console.log('❌ Error fetching final barracks items:', finalError.message)
    return
  }

  console.log(`Barracks items for auction ${auction.id}:`)
  finalBarracksItems.forEach(item => {
    console.log(`  - Item ${item.id} (${item.status}) - User: ${item.user_id} - Amount: $${item.amount_cents/100}`)
  })

  console.log('\n🎉 Buy Now Test Completed Successfully!')
  console.log('\n📋 What happened:')
  console.log('1. ✅ Buy now purchase simulated')
  console.log('2. ✅ Barracks item created with PENDING_PAYMENT status')
  console.log('3. ✅ Winning bid created with NULL bid_id')
  console.log('4. ✅ Payment verification simulated')
  console.log('5. ✅ Item status updated to PAID')
  console.log('6. ✅ Item now accessible in barracks')

  console.log('\n🎯 Check your barracks page - the item should be there!')
}

// Run the test
testBuyNow().catch(console.error)
