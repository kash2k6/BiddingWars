const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPaymentStatus() {
  console.log('🔍 Checking payment status for barracks items...\n')
  
  const { data: items, error } = await supabase
    .from('barracks_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Recent barracks items:')
  items.forEach(item => {
    console.log(`- ID: ${item.id}`)
    console.log(`  Status: ${item.status}`)
    console.log(`  Plan ID: ${item.plan_id}`)
    console.log(`  Amount: $${(item.amount_cents / 100).toFixed(2)}`)
    console.log(`  Paid at: ${item.paid_at}`)
    console.log(`  Created: ${item.created_at}`)
    console.log('---')
  })
}

checkPaymentStatus()
