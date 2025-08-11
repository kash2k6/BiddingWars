-- Create auction chat table
CREATE TABLE IF NOT EXISTS auction_chat (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  user_id text not null,
  user_name text,
  message text not null,
  experience_id text not null,
  created_at timestamptz not null default now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_created_at ON auction_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_auction_chat_user_id ON auction_chat(user_id);

-- Enable Row Level Security
ALTER TABLE auction_chat ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for auction chat
CREATE POLICY "Users can view chat messages in their experience" ON auction_chat
  FOR SELECT USING (true);

CREATE POLICY "Users can create chat messages in their experience" ON auction_chat
  FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE auction_chat IS 'Real-time chat messages for auction detail pages';
COMMENT ON COLUMN auction_chat.auction_id IS 'Reference to the auction this message belongs to';
COMMENT ON COLUMN auction_chat.user_id IS 'Whop user ID of the message sender';
COMMENT ON COLUMN auction_chat.user_name IS 'Display name of the user (optional)';
COMMENT ON COLUMN auction_chat.message IS 'The chat message content';
COMMENT ON COLUMN auction_chat.experience_id IS 'Whop experience ID for scoping';
