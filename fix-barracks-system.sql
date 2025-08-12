-- Fix Barracks System
-- Run this in your Supabase SQL editor to add PENDING_PAYMENT support and fix winning_bids

-- 1. Update barracks_items status constraint to include PENDING_PAYMENT
ALTER TABLE barracks_items DROP CONSTRAINT IF EXISTS barracks_items_status_check;
ALTER TABLE barracks_items ADD CONSTRAINT barracks_items_status_check 
  CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'FULFILLED', 'DISPUTED', 'REFUNDED'));

-- 2. Update winning_bids table to handle missing bid_id gracefully
-- First, let's check if there are any existing winning_bids that might cause issues
DELETE FROM winning_bids WHERE bid_id IS NULL;

-- 3. Make bid_id nullable in winning_bids table (since some auctions might not have bids)
ALTER TABLE winning_bids ALTER COLUMN bid_id DROP NOT NULL;

-- 4. Add a conditional foreign key constraint for bid_id
ALTER TABLE winning_bids DROP CONSTRAINT IF EXISTS winning_bids_bid_id_fkey;
ALTER TABLE winning_bids ADD CONSTRAINT winning_bids_bid_id_fkey 
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE;

-- 5. Update the function to handle missing bid_id
CREATE OR REPLACE FUNCTION create_winning_bid()
RETURNS TRIGGER AS $$
DECLARE
  top_bid_record RECORD;
BEGIN
  -- Only process when auction status changes to ENDED
  IF NEW.status = 'ENDED' AND OLD.status != 'ENDED' THEN
    -- Get the highest bid for this auction
    SELECT b.id, b.bidder_user_id, b.amount_cents
    INTO top_bid_record
    FROM bids b
    WHERE b.auction_id = NEW.id
    ORDER BY b.amount_cents DESC, b.created_at ASC
    LIMIT 1;
    
    -- If there's a winning bid, create the winning_bid record
    IF top_bid_record.id IS NOT NULL THEN
      INSERT INTO winning_bids (auction_id, user_id, bid_id, amount_cents)
      VALUES (NEW.id, top_bid_record.bidder_user_id, top_bid_record.id, top_bid_record.amount_cents)
      ON CONFLICT (auction_id) DO NOTHING;
      
      -- Update the auction with winner info
      UPDATE auctions 
      SET winner_user_id = top_bid_record.bidder_user_id,
          current_bid_id = top_bid_record.id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update the add_to_barracks function to handle missing bid_id
CREATE OR REPLACE FUNCTION add_to_barracks()
RETURNS TRIGGER AS $$
BEGIN
  -- When a winning bid payment is processed, add to barracks
  IF NEW.payment_processed = true AND OLD.payment_processed = false THEN
    INSERT INTO barracks_items (user_id, auction_id, plan_id, amount_cents, payment_id)
    VALUES (NEW.user_id, NEW.auction_id, 
            (SELECT experience_id FROM auctions WHERE id = NEW.auction_id), 
            NEW.amount_cents, NEW.payment_id)
    ON CONFLICT (user_id, auction_id) DO UPDATE SET
      payment_id = NEW.payment_id,
      updated_at = now();
      
    -- Update auction status to PAID
    UPDATE auctions 
    SET status = 'PAID',
        payment_id = NEW.payment_id
    WHERE id = NEW.auction_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Update the mark_barracks_item_fulfilled function
CREATE OR REPLACE FUNCTION mark_barracks_item_fulfilled(item_id uuid, user_id_param text)
RETURNS boolean AS $$
BEGIN
  UPDATE barracks_items 
  SET status = 'FULFILLED',
      updated_at = now()
  WHERE id = item_id 
    AND user_id = user_id_param;
    
  IF FOUND THEN
    -- Also update the auction status
    UPDATE auctions 
    SET status = 'FULFILLED'
    WHERE id = (SELECT auction_id FROM barracks_items WHERE id = item_id);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 8. Add comments for documentation
COMMENT ON COLUMN barracks_items.status IS 'Status: PENDING_PAYMENT, PAID, FULFILLED, DISPUTED, REFUNDED';
COMMENT ON COLUMN winning_bids.bid_id IS 'Can be NULL for auctions without bids (e.g., buy now)';

-- Success message
SELECT 'Barracks system has been updated with PENDING_PAYMENT support and winning_bids fixes!' as status;
