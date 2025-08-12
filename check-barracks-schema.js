// Check Barracks Schema
// This script checks the current schema of the barracks_items table

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://fdvzkpucafqkguglqgpu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBarracksSchema() {
  console.log('🔍 Checking Barracks Schema...\n')

  // Try to get table info by attempting different column queries
  const testColumns = [
    'id',
    'user_id', 
    'auction_id',
    'plan_id',
    'amount_cents',
    'status',
    'paid_at',
    'created_at',
    'updated_at',
    'payment_id'
  ]

  console.log('Testing columns in barracks_items table:')
  
  for (const column of testColumns) {
    try {
      const { data, error } = await supabase
        .from('barracks_items')
        .select(column)
        .limit(1)
      
      if (error) {
        console.log(`❌ ${column}: ${error.message}`)
      } else {
        console.log(`✅ ${column}: exists`)
      }
    } catch (error) {
      console.log(`❌ ${column}: ${error.message}`)
    }
  }

  // Check if winning_bids table exists
  console.log('\nChecking winning_bids table:')
  try {
    const { data, error } = await supabase
      .from('winning_bids')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ winning_bids table: ${error.message}`)
    } else {
      console.log(`✅ winning_bids table: exists`)
    }
  } catch (error) {
    console.log(`❌ winning_bids table: ${error.message}`)
  }

  console.log('\n🎯 Recommendation:')
  console.log('If payment_id column is missing, run the barracks-system.sql in Supabase SQL editor.')
}

// Run the check
checkBarracksSchema().catch(console.error)
