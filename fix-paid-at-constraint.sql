-- Fix paid_at constraint in barracks_items table
-- Run this in your Supabase SQL editor

-- 1. First, make paid_at nullable
ALTER TABLE barracks_items ALTER COLUMN paid_at DROP NOT NULL;

-- 2. Add a check constraint that allows null for PENDING_PAYMENT and requires not null for other statuses
ALTER TABLE barracks_items DROP CONSTRAINT IF EXISTS barracks_items_paid_at_check;
ALTER TABLE barracks_items ADD CONSTRAINT barracks_items_paid_at_check 
  CHECK (
    (status = 'PENDING_PAYMENT' AND paid_at IS NULL) OR
    (status IN ('PAID', 'FULFILLED', 'DISPUTED', 'REFUNDED') AND paid_at IS NOT NULL)
  );

-- 3. Update any existing PENDING_PAYMENT items to have null paid_at
UPDATE barracks_items 
SET paid_at = NULL 
WHERE status = 'PENDING_PAYMENT' AND paid_at IS NOT NULL;

-- 4. Verify the changes
SELECT 
  'barracks_items constraints updated successfully!' as status,
  'paid_at can now be NULL for PENDING_PAYMENT status' as details;
