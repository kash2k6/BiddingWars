import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running barracks shipping address migration...')
    
    // Test if shipping_address column already exists by trying to select it
    const { data: testData, error: testError } = await supabaseServer
      .from('barracks_items')
      .select('shipping_address')
      .limit(1)

    if (testError && testError.message.includes('column "shipping_address" does not exist')) {
      console.log('Shipping address column does not exist, need to run migration...')
      
      // Since we can't run ALTER TABLE directly through Supabase client,
      // we'll need to manually add the columns through the Supabase dashboard
      // For now, let's return instructions
      return NextResponse.json({
        success: false,
        message: 'Migration needed - shipping_address column does not exist',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Run the contents of add-shipping-to-barracks.sql',
          '4. This will add the missing shipping_address column to barracks_items table'
        ],
        sqlToRun: `
          ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipping_address jsonb;
          ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS tracking_number text;
          ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipping_carrier text;
          ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;
          ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
          
          DROP VIEW IF EXISTS v_barracks_items;
          CREATE OR REPLACE VIEW v_barracks_items AS
          SELECT 
            bi.id as id,
            bi.auction_id,
            bi.user_id,
            a.experience_id,
            bi.status as barracks_status,
            bi.amount_cents,
            bi.paid_at,
            bi.created_at,
            bi.updated_at,
            bi.payment_id,
            bi.plan_id,
            bi.shipping_address,
            bi.tracking_number,
            bi.shipping_carrier,
            bi.shipped_at,
            bi.delivered_at,
            a.title,
            a.description,
            a.type as auction_type,
            a.created_by_user_id as seller_id,
            a.digital_delivery_type as delivery_type,
            a.digital_file_path as file_url,
            a.digital_download_link as download_link,
            a.digital_discount_code as discount_code
          FROM barracks_items bi
          LEFT JOIN auctions a ON bi.auction_id = a.id;
        `
      }, { status: 400 })
    }

    if (testError) {
      console.error('❌ Test query failed:', testError)
      return NextResponse.json({ 
        success: false, 
        error: testError.message
      }, { status: 500 })
    }

    console.log('✅ Shipping address column already exists!')
    
    return NextResponse.json({
      success: true,
      message: 'Shipping address column already exists - no migration needed!',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Migration check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
