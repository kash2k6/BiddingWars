-- Add shipping columns to barracks_items table
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipping_carrier text;
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;
ALTER TABLE barracks_items ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Add comments
COMMENT ON COLUMN barracks_items.shipping_address IS 'Shipping address for physical items (JSON format)';
COMMENT ON COLUMN barracks_items.tracking_number IS 'Tracking number for shipped items';
COMMENT ON COLUMN barracks_items.shipping_carrier IS 'Shipping carrier (USPS, FedEx, UPS, etc.)';
COMMENT ON COLUMN barracks_items.shipped_at IS 'Timestamp when item was marked as shipped';
COMMENT ON COLUMN barracks_items.delivered_at IS 'Timestamp when item was marked as delivered';

-- Update the v_barracks_items view to include shipping columns
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
