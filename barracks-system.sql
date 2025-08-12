-- Bidding Wars - Barracks System Setup
-- Run this in your Supabase SQL editor to add the barracks system

-- 0. Ensure shipping address columns exist (in case setup-missing-features.sql wasn't run)
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_carrier text;

-- 1. Create barracks_items table to track purchased items
CREATE TABLE IF NOT EXISTS barracks_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  auction_id uuid not null references auctions(id) on delete cascade,
  plan_id text not null,
  amount_cents int not null,
  status text not null default 'PAID' check (status in ('PAID', 'FULFILLED', 'DISPUTED', 'REFUNDED')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, auction_id)
);

-- 2. Create indexes for barracks_items
CREATE INDEX IF NOT EXISTS idx_barracks_items_user_id ON barracks_items(user_id);
CREATE INDEX IF NOT EXISTS idx_barracks_items_auction_id ON barracks_items(auction_id);
CREATE INDEX IF NOT EXISTS idx_barracks_items_status ON barracks_items(status);
CREATE INDEX IF NOT EXISTS idx_barracks_items_paid_at ON barracks_items(paid_at);

-- 3. Enable RLS for barracks_items
ALTER TABLE barracks_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for barracks_items
CREATE POLICY "Users can view their own barracks items" ON barracks_items
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::text);

CREATE POLICY "System can insert barracks items" ON barracks_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own barracks items" ON barracks_items
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true)::text);

-- 5. Create winning_bids table to track auction winners
CREATE TABLE IF NOT EXISTS winning_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  user_id text not null,
  bid_id uuid not null references bids(id) on delete cascade,
  amount_cents int not null,
  won_at timestamptz not null default now(),
  payment_processed boolean not null default false,
  payment_id text,
  created_at timestamptz not null default now(),
  unique(auction_id)
);

-- 6. Create indexes for winning_bids
CREATE INDEX IF NOT EXISTS idx_winning_bids_user_id ON winning_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_winning_bids_auction_id ON winning_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_winning_bids_payment_processed ON winning_bids(payment_processed);

-- 7. Enable RLS for winning_bids
ALTER TABLE winning_bids ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for winning_bids
CREATE POLICY "Users can view winning bids for auctions they're involved in" ON winning_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = winning_bids.auction_id 
      AND (auctions.created_by_user_id = current_setting('app.current_user_id', true)::text 
           OR winning_bids.user_id = current_setting('app.current_user_id', true)::text)
    )
  );

CREATE POLICY "System can insert winning bids" ON winning_bids
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update winning bids" ON winning_bids
  FOR UPDATE USING (true);

-- 9. Create function to automatically create winning bid when auction ends
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

-- 10. Create trigger for automatic winning bid creation
CREATE TRIGGER trigger_create_winning_bid
  AFTER UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION create_winning_bid();

-- 11. Create function to automatically add items to barracks when payment is processed
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

-- 12. Create trigger for automatic barracks addition
CREATE TRIGGER trigger_add_to_barracks
  AFTER UPDATE ON winning_bids
  FOR EACH ROW
  EXECUTE FUNCTION add_to_barracks();

-- 13. Create view for barracks items with full details
CREATE OR REPLACE VIEW v_barracks_items AS
SELECT 
  bi.id as barracks_item_id,
  bi.user_id,
  bi.plan_id,
  bi.amount_cents,
  bi.status as barracks_status,
  bi.paid_at,
  bi.created_at as barracks_created_at,
  a.id as auction_id,
  a.title,
  a.description,
  a.type as auction_type,
  a.status as auction_status,
  a.images,
  a.digital_delivery_type,
  a.digital_file_path,
  a.digital_discount_code,
  a.digital_download_link,
  a.digital_instructions,
  a.shipping_cost_cents,
  a.created_by_user_id as seller_id,
  f.shipping_address,
  f.tracking_number,
  f.shipping_carrier,
  f.physical_state,
  f.digital_delivered_at,
  f.digital_access_granted,
  wb.payment_id,
  wb.payment_processed
FROM barracks_items bi
JOIN auctions a ON bi.auction_id = a.id
LEFT JOIN fulfillments f ON a.id = f.auction_id
LEFT JOIN winning_bids wb ON a.id = wb.auction_id
ORDER BY bi.paid_at DESC;

-- 14. Create view for auction winners
CREATE OR REPLACE VIEW v_auction_winners AS
SELECT 
  wb.id as winning_bid_id,
  wb.auction_id,
  wb.user_id as winner_user_id,
  wb.amount_cents as winning_amount,
  wb.won_at,
  wb.payment_processed,
  wb.payment_id,
  a.title as auction_title,
  a.type as auction_type,
  a.status as auction_status,
  a.experience_id,
  b.amount_cents as bid_amount,
  b.created_at as bid_created_at
FROM winning_bids wb
JOIN auctions a ON wb.auction_id = a.id
JOIN bids b ON wb.bid_id = b.id
ORDER BY wb.won_at DESC;

-- 15. Create function to get user's barracks summary
CREATE OR REPLACE FUNCTION get_user_barracks_summary(user_id_param text)
RETURNS TABLE (
  total_items bigint,
  digital_items bigint,
  physical_items bigint,
  total_spent_cents bigint,
  pending_items bigint,
  fulfilled_items bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE a.type = 'DIGITAL') as digital_items,
    COUNT(*) FILTER (WHERE a.type = 'PHYSICAL') as physical_items,
    COALESCE(SUM(bi.amount_cents), 0) as total_spent_cents,
    COUNT(*) FILTER (WHERE bi.status = 'PAID') as pending_items,
    COUNT(*) FILTER (WHERE bi.status = 'FULFILLED') as fulfilled_items
  FROM barracks_items bi
  JOIN auctions a ON bi.auction_id = a.id
  WHERE bi.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 16. Add comments for documentation
COMMENT ON TABLE barracks_items IS 'Items purchased by users, stored in their barracks';
COMMENT ON TABLE winning_bids IS 'Records of auction winners and their winning bids';
COMMENT ON VIEW v_barracks_items IS 'Complete view of barracks items with all related data';
COMMENT ON VIEW v_auction_winners IS 'View of all auction winners and their details';
COMMENT ON FUNCTION get_user_barracks_summary IS 'Get summary statistics for a user''s barracks';

-- 17. Create function to mark item as fulfilled
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

-- Success message
SELECT 'Barracks system has been successfully created!' as status;
