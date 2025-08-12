const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function forceReset() {
  console.log('🔄 Force resetting items to PENDING_PAYMENT...\n')
  
  // Reset specific items by ID
  const itemIds = [
    '875ee1b6-8c67-4109-86c8-8e02fdf520ef',
    'f0bbae05-61c0-4a8f-aebe-85e1faab6438'
  ]
  
  for (const itemId of itemIds) {
    console.log(`Force resetting item: ${itemId}`)
    
    const { error } = await supabase
      .from('barracks_items')
      .update({
        status: 'PENDING_PAYMENT',
        paid_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
    
    if (error) {
      console.error(`Error resetting item ${itemId}:`, error)
    } else {
      console.log(`✅ Successfully reset item ${itemId}`)
    }
  }
  
  console.log('\n🔄 Force reset complete!')
  
  // Verify the reset
  console.log('\n🔍 Verifying reset...')
  const { data: items, error } = await supabase
    .from('barracks_items')
    .select('*')
    .in('id', itemIds)
  
  if (error) {
    console.error('Error verifying:', error)
    return
  }
  
  items.forEach(item => {
    console.log(`- ID: ${item.id} - Status: ${item.status}`)
  })
}

forceReset()
