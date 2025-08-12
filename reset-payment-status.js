const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetPaymentStatus() {
  console.log('🔄 Resetting incorrectly marked items to PENDING_PAYMENT...\n')
  
  // Find items that are marked as PAID but have temp_plan_ IDs (meaning they weren't actually paid)
  const { data: items, error } = await supabase
    .from('barracks_items')
    .select('*')
    .eq('status', 'PAID')
    .like('plan_id', 'temp_plan_%')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${items.length} items to reset:`)
  items.forEach(item => {
    console.log(`- ID: ${item.id}, Plan ID: ${item.plan_id}, Amount: $${(item.amount_cents / 100).toFixed(2)}`)
  })
  
  if (items.length === 0) {
    console.log('No items to reset')
    return
  }
  
  // Reset them to PENDING_PAYMENT
  const { error: updateError } = await supabase
    .from('barracks_items')
    .update({
      status: 'PENDING_PAYMENT',
      paid_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('status', 'PAID')
    .like('plan_id', 'temp_plan_%')
  
  if (updateError) {
    console.error('Error updating items:', updateError)
    return
  }
  
  console.log('✅ Successfully reset items to PENDING_PAYMENT')
}

resetPaymentStatus()
