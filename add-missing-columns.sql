-- Add missing columns for barracks system
-- Run this in your Supabase SQL editor

-- Add payment_id column to barracks_items table
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS payment_id text;

-- Add comment for documentation
COMMENT ON COLUMN barracks_items.payment_id IS 'Payment ID from Whop for tracking payment status';

-- Success message
SELECT 'Missing columns have been added to barracks_items table!' as status;
