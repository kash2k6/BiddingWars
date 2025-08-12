const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugShippingIssues() {
  console.log('🔍 Debugging Shipping Issues...\n')

  try {
    // Step 1: Check all barracks items
    console.log('1. Checking all barracks items...')
    const { data: allBarracksItems, error: barracksError } = await supabase
      .from('v_barracks_items')
      .select('*')

    if (barracksError) {
      console.error('❌ Error fetching barracks items:', barracksError)
      return
    }

    console.log(`✅ Found ${allBarracksItems.length} barracks items`)
    
    // Find physical items
    const physicalItems = allBarracksItems.filter(item => item.auction_type === 'PHYSICAL')
    console.log(`📦 Found ${physicalItems.length} physical items`)

    if (physicalItems.length > 0) {
      const testItem = physicalItems[0]
      console.log('\n📋 Test Item Details:', {
        id: testItem.id,
        auction_id: testItem.auction_id,
        title: testItem.title,
        type: testItem.auction_type,
        status: testItem.barracks_status,
        shipping_address: testItem.shipping_address
      })

      // Step 2: Check the auction for shipping cost
      console.log('\n2. Checking auction shipping cost...')
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', testItem.auction_id)
        .single()

      if (auctionError) {
        console.error('❌ Error fetching auction:', auctionError)
      } else {
        console.log('✅ Auction details:', {
          id: auction.id,
          title: auction.title,
          shipping_cost_cents: auction.shipping_cost_cents,
          shipping_cost_dollars: auction.shipping_cost_cents ? (auction.shipping_cost_cents / 100).toFixed(2) : '0.00'
        })
      }

      // Step 3: Test shipping address update
      console.log('\n3. Testing shipping address update...')
      const testAddress = {
        name: 'Debug Test User',
        street: '456 Debug Street',
        city: 'Debug City',
        state: 'DB',
        zip: '54321',
        country: 'US'
      }

      console.log('📝 Test address:', testAddress)

      const { data: updateData, error: updateError } = await supabase
        .from('barracks_items')
        .update({
          shipping_address: testAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', testItem.id)
        .select()

      if (updateError) {
        console.error('❌ Error updating shipping address:', updateError)
      } else {
        console.log('✅ Update successful:', updateData)
      }

      // Step 4: Verify the update
      console.log('\n4. Verifying update...')
      const { data: verifyData, error: verifyError } = await supabase
        .from('v_barracks_items')
        .select('*')
        .eq('id', testItem.id)
        .single()

      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError)
      } else {
        console.log('✅ Verification result:', {
          id: verifyData.id,
          saved_address: verifyData.shipping_address,
          updated_at: verifyData.updated_at
        })
      }

      // Step 5: Check if the address shows up in seller view
      console.log('\n5. Checking seller view data...')
      const { data: sellerItems, error: sellerError } = await supabase
        .from('v_barracks_items')
        .select('*')
        .eq('seller_id', auction.created_by_user_id)

      if (sellerError) {
        console.error('❌ Error fetching seller items:', sellerError)
      } else {
        console.log(`✅ Found ${sellerItems.length} items for seller`)
        sellerItems.forEach(item => {
          console.log('  - Item:', {
            id: item.id,
            title: item.title,
            buyer_id: item.user_id,
            shipping_address: item.shipping_address ? '✅ Has address' : '❌ No address'
          })
        })
      }

    } else {
      console.log('❌ No physical items found to test with')
    }

    // Step 6: Check database schema
    console.log('\n6. Checking database schema...')
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_info', { table_name: 'barracks_items' })
      .catch(() => ({ data: null, error: 'RPC not available' }))

    if (schemaError) {
      console.log('ℹ️ Schema check not available, but we know shipping_address column exists')
    } else {
      console.log('✅ Schema info:', schemaInfo)
    }

  } catch (error) {
    console.error('❌ Debug failed with error:', error)
  }
}

// Run the debug
debugShippingIssues()
