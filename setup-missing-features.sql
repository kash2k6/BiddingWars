-- Bidding Wars - Missing Features Setup
-- Run this in your Supabase SQL editor to add all missing features

-- 1. Add shipping address fields
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_carrier text;

-- 2. Create chat system
CREATE TABLE IF NOT EXISTS auction_chat (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  user_id text not null,
  user_name text,
  message text not null,
  experience_id text not null,
  created_at timestamptz not null default now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_created_at ON auction_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_auction_chat_user_id ON auction_chat(user_id);

-- 4. Enable RLS for chat
ALTER TABLE auction_chat ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for chat
CREATE POLICY "Users can view chat messages in their experience" ON auction_chat
  FOR SELECT USING (true);

CREATE POLICY "Users can create chat messages in their experience" ON auction_chat
  FOR INSERT WITH CHECK (true);

-- 6. Create dispute system
CREATE TABLE IF NOT EXISTS disputes (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  created_by_user_id text not null,
  dispute_type text not null check (dispute_type in ('ITEM_NOT_RECEIVED', 'ITEM_NOT_AS_DESCRIBED', 'PAYMENT_ISSUE', 'OTHER')),
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
  resolution text,
  resolved_by_user_id text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Create indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_auction_id ON disputes(auction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_by_user_id ON disputes(created_by_user_id);

-- 8. Enable RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for disputes
CREATE POLICY "Users can view disputes for auctions they're involved in" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = disputes.auction_id 
      AND (auctions.created_by_user_id = current_setting('app.current_user_id', true)::text 
           OR auctions.winner_user_id = current_setting('app.current_user_id', true)::text)
    )
  );

CREATE POLICY "Users can create disputes for auctions they're involved in" ON disputes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = disputes.auction_id 
      AND (auctions.created_by_user_id = current_setting('app.current_user_id', true)::text 
           OR auctions.winner_user_id = current_setting('app.current_user_id', true)::text)
    )
  );

-- 10. Create analytics table for tracking
CREATE TABLE IF NOT EXISTS auction_analytics (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  experience_id text not null,
  total_bids int not null default 0,
  unique_bidders int not null default 0,
  total_views int not null default 0,
  unique_viewers int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auction_id)
);

-- 11. Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_auction_analytics_experience_id ON auction_analytics(experience_id);

-- 12. Enable RLS for analytics
ALTER TABLE auction_analytics ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for analytics
CREATE POLICY "Users can view analytics for their experience" ON auction_analytics
  FOR SELECT USING (true);

-- 14. Add comments for documentation
COMMENT ON TABLE auction_chat IS 'Real-time chat messages for auction detail pages';
COMMENT ON TABLE disputes IS 'Dispute system for handling auction issues';
COMMENT ON TABLE auction_analytics IS 'Analytics tracking for auction performance';
COMMENT ON COLUMN auctions.shipping_address IS 'Shipping address for physical items (JSON format)';
COMMENT ON COLUMN fulfillments.shipping_address IS 'Shipping address used for delivery';
COMMENT ON COLUMN fulfillments.tracking_number IS 'Tracking number for shipped items';
COMMENT ON COLUMN fulfillments.shipping_carrier IS 'Shipping carrier (USPS, FedEx, UPS, etc.)';

-- 15. Create function to update analytics
CREATE OR REPLACE FUNCTION update_auction_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auction_analytics (auction_id, experience_id, total_bids, unique_bidders)
  VALUES (NEW.auction_id, NEW.experience_id, 1, 1)
  ON CONFLICT (auction_id) DO UPDATE SET
    total_bids = auction_analytics.total_bids + 1,
    unique_bidders = (
      SELECT COUNT(DISTINCT bidder_user_id) 
      FROM bids 
      WHERE auction_id = NEW.auction_id
    ),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger for analytics
CREATE TRIGGER trigger_update_analytics
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_analytics();

-- 17. Create view for auction statistics
CREATE OR REPLACE VIEW v_auction_stats AS
SELECT 
  a.id,
  a.title,
  a.experience_id,
  a.status,
  a.type,
  COUNT(b.id) as total_bids,
  COUNT(DISTINCT b.bidder_user_id) as unique_bidders,
  MAX(b.amount_cents) as highest_bid,
  a.start_price_cents,
  a.buy_now_price_cents,
  a.created_at,
  a.ends_at
FROM auctions a
LEFT JOIN bids b ON a.id = b.auction_id
GROUP BY a.id, a.title, a.experience_id, a.status, a.type, a.start_price_cents, a.buy_now_price_cents, a.created_at, a.ends_at;

-- Success message
SELECT 'All missing features have been successfully added to the database!' as status;
