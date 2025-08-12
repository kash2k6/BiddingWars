-- Add COMING_SOON status to auction_status enum
-- Run this in the Supabase SQL Editor
ALTER TYPE auction_status ADD VALUE IF NOT EXISTS 'COMING_SOON';

-- After running the above, you can run these updates:
-- Update existing DRAFT auctions that should be COMING_SOON (future auctions)
UPDATE auctions 
SET status = 'COMING_SOON' 
WHERE status = 'DRAFT' 
  AND starts_at > NOW() 
  AND ends_at > NOW();

-- Update existing LIVE auctions that should be ENDED based on end time
UPDATE auctions 
SET status = 'ENDED' 
WHERE status = 'LIVE' 
  AND ends_at <= NOW();
