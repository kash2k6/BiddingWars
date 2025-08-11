-- Add Digital Product Columns to Auctions Table
-- Run this in your Supabase SQL editor

-- Add the digital_delivery_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE digital_delivery_type AS ENUM ('FILE', 'DISCOUNT_CODE', 'DOWNLOAD_LINK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add digital product columns to auctions table
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS digital_delivery_type digital_delivery_type,
ADD COLUMN IF NOT EXISTS digital_file_path text,
ADD COLUMN IF NOT EXISTS digital_discount_code text,
ADD COLUMN IF NOT EXISTS digital_download_link text,
ADD COLUMN IF NOT EXISTS digital_instructions text;

-- Add digital delivery fields to fulfillments table
ALTER TABLE fulfillments 
ADD COLUMN IF NOT EXISTS digital_delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS digital_access_granted boolean NOT NULL DEFAULT false;

-- Create index for auction type
CREATE INDEX IF NOT EXISTS idx_auctions_type ON auctions(type);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auctions' 
AND column_name LIKE 'digital_%';

-- Show the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auctions' 
ORDER BY ordinal_position;
