-- Add DELIVERED status to barracks_items status enum (if it exists)
-- First check if the enum exists, if not we'll just use text status
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'barracks_item_status') THEN
        ALTER TYPE barracks_item_status ADD VALUE IF NOT EXISTS 'DELIVERED';
    END IF;
END $$;

-- Update existing barracks_items to use DELIVERED instead of any custom status
-- (This is just in case there are any items with custom delivered statuses)
UPDATE barracks_items 
SET status = 'DELIVERED' 
WHERE status = 'delivered' OR status = 'DELIVERED';
