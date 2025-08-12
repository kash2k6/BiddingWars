const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPlanMismatch() {
  console.log('🔍 Checking for plan ID mismatches...\n')
  
  // Get all barracks items
  const { data: items, error } = await supabase
    .from('barracks_items')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Database barracks items:')
  items.forEach(item => {
    console.log(`- ID: ${item.id}`)
    console.log(`  Status: ${item.status}`)
    console.log(`  Plan ID: ${item.plan_id}`)
    console.log(`  Amount: $${(item.amount_cents / 100).toFixed(2)}`)
    console.log(`  User ID: ${item.user_id}`)
    console.log(`  Created: ${item.created_at}`)
    console.log('---')
  })
  
  // Check which plan IDs actually have payments
  const paidPlanIds = [
    'plan_Eylml6KOsAbWD',
    'plan_gEecES03lj9QP', 
    'plan_bokIhaqhy9VKE'
  ]
  
  console.log('\nPlan IDs that have actual payments in Whop:')
  paidPlanIds.forEach(planId => {
    console.log(`- ${planId}`)
  })
  
  console.log('\nMatching items:')
  items.forEach(item => {
    if (paidPlanIds.includes(item.plan_id)) {
      console.log(`✅ ${item.id} - Plan ${item.plan_id} has payments`)
    } else {
      console.log(`❌ ${item.id} - Plan ${item.plan_id} has NO payments`)
    }
  })
}

checkPlanMismatch()
