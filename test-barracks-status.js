const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBarracksStatus() {
  console.log('🔍 Testing Barracks Items Status Support...\n')

  // Test different statuses
  const statuses = ['PENDING_PAYMENT', 'PAID', 'FULFILLED', 'DISPUTED', 'REFUNDED']
  
  for (const status of statuses) {
    try {
      console.log(`Testing status: ${status}`)
      
      const { data, error } = await supabase
        .from('barracks_items')
        .insert({
          user_id: 'user_ojPhs9dIhFQ9C',
          auction_id: 'b7f2ad45-2356-4db4-9abd-ed66754a900b', // Use real auction ID
          plan_id: 'plan_bokIhaqhy9VKE',
          amount_cents: 100,
          payment_id: `ch_test_${status}`,
          status: status
        })
        .select()
        .single()

      if (error) {
        console.log(`❌ ${status}: ${error.message}`)
      } else {
        console.log(`✅ ${status}: Success - ID: ${data.id}`)
        
        // Clean up - delete the test record
        await supabase
          .from('barracks_items')
          .delete()
          .eq('id', data.id)
      }
    } catch (err) {
      console.log(`❌ ${status}: ${err.message}`)
    }
  }

  console.log('\n📋 Summary:')
  console.log('If you see errors for PENDING_PAYMENT, you need to run fix-barracks-system.sql')
  console.log('If all statuses work, the system is ready!')
}

testBarracksStatus().catch(console.error)
