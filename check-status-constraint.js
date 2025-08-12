// Check Status Constraint
// This script checks what status values are allowed in barracks_items

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStatusConstraint() {
  console.log('🔍 Checking Status Constraint...\n')

  // Try different status values
  const testStatuses = [
    'PAID',
    'FULFILLED', 
    'DISPUTED',
    'REFUNDED',
    'PENDING_PAYMENT'
  ]

  console.log('Testing status values in barracks_items table:')
  
  for (const status of testStatuses) {
    try {
      const { data, error } = await supabase
        .from('barracks_items')
        .insert({
          user_id: 'test_user',
          auction_id: '00000000-0000-0000-0000-000000000000',
          plan_id: 'test_plan',
          amount_cents: 1000,
          status: status
        })
        .select()
        .single()
      
      if (error) {
        console.log(`❌ ${status}: ${error.message}`)
      } else {
        console.log(`✅ ${status}: allowed`)
        // Clean up the test record
        await supabase
          .from('barracks_items')
          .delete()
          .eq('id', data.id)
      }
    } catch (error) {
      console.log(`❌ ${status}: ${error.message}`)
    }
  }

  console.log('\n🎯 Based on the barracks-system.sql, allowed statuses should be:')
  console.log('- PAID')
  console.log('- FULFILLED') 
  console.log('- DISPUTED')
  console.log('- REFUNDED')
}

// Run the check
checkStatusConstraint().catch(console.error)
