// Monitor Test Flow
// Simple script to monitor what's happening with your test auction

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function monitorTestFlow() {
  console.log('👀 Monitoring Test Flow...\n')
  console.log('Press Ctrl+C to stop monitoring\n')

  // Monitor every 5 seconds
  setInterval(async () => {
    try {
      // Check test auction
      const { data: auctions, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .ilike('title', '%TEST%')
        .order('created_at', { ascending: false })
        .limit(3)

      if (auctionError) {
        console.log('❌ Error fetching auctions:', auctionError.message)
        return
      }

      console.log(`\n🕐 ${new Date().toLocaleTimeString()}`)
      console.log(`📊 Found ${auctions.length} test auctions:`)
      
      auctions.forEach(auction => {
        console.log(`  - ${auction.title}`)
        console.log(`    Status: ${auction.status}`)
        console.log(`    Ends: ${new Date(auction.ends_at).toLocaleTimeString()}`)
        console.log(`    Winner: ${auction.winner_user_id || 'None'}`)
      })

      // Check barracks items
      const { data: barracksItems, error: barracksError } = await supabase
        .from('barracks_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (barracksError) {
        console.log('❌ Error fetching barracks items:', barracksError.message)
        return
      }

      console.log(`\n🎖️  Barracks Items (${barracksItems.length}):`)
      barracksItems.forEach(item => {
        console.log(`  - Item ${item.id.slice(0, 8)}...`)
        console.log(`    Status: ${item.status}`)
        console.log(`    Amount: $${item.amount_cents/100}`)
        console.log(`    User: ${item.user_id}`)
      })

      // Check winning bids
      const { data: winningBids, error: winningError } = await supabase
        .from('winning_bids')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      if (winningError) {
        console.log('❌ Error fetching winning bids:', winningError.message)
        return
      }

      console.log(`\n🏆 Winning Bids (${winningBids.length}):`)
      winningBids.forEach(bid => {
        console.log(`  - Auction: ${bid.auction_id.slice(0, 8)}...`)
        console.log(`    User: ${bid.user_id}`)
        console.log(`    Amount: $${bid.amount_cents/100}`)
        console.log(`    Payment: ${bid.payment_processed ? '✅' : '❌'}`)
      })

      console.log('\n' + '─'.repeat(50))

    } catch (error) {
      console.log('❌ Monitoring error:', error.message)
    }
  }, 5000) // Check every 5 seconds
}

// Run the monitor
monitorTestFlow().catch(console.error)
