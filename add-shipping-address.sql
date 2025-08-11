-- Add shipping address fields to auctions table
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- Add shipping address fields to fulfillments table
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE fulfillments ADD COLUMN IF NOT EXISTS shipping_carrier text;

-- Create shipping address type for better structure
CREATE TYPE shipping_address_type AS (
  name text,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text,
  phone text
);

-- Add comment for documentation
COMMENT ON COLUMN auctions.shipping_address IS 'Shipping address for physical items (JSON format)';
COMMENT ON COLUMN fulfillments.shipping_address IS 'Shipping address used for delivery';
COMMENT ON COLUMN fulfillments.tracking_number IS 'Tracking number for shipped items';
COMMENT ON COLUMN fulfillments.shipping_carrier IS 'Shipping carrier (USPS, FedEx, UPS, etc.)';
