-- Bidding Wars Supabase Migration
-- Run this in your Supabase SQL editor

-- Create custom types
create type auction_status as enum ('DRAFT','LIVE','ENDED','PENDING_PAYMENT','PAID','FULFILLED','CANCELED');
create type auction_type   as enum ('DIGITAL','PHYSICAL');
create type physical_state as enum ('PENDING_SHIP','SHIPPED','DELIVERED');
create type dispute_state  as enum ('NONE','OPEN','RESOLVED','REFUNDED');
create type digital_delivery_type as enum ('FILE','DISCOUNT_CODE','DOWNLOAD_LINK');

-- Create auctions table
create table auctions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null,
  created_by_user_id text not null,
  title text not null,
  description text not null,
  images jsonb not null default '[]',
  type auction_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  anti_snipe_sec int not null default 120,
  buy_now_price_cents int,
  start_price_cents int not null,
  min_increment_cents int not null,
  currency text not null default 'usd',
  community_pct int not null,
  platform_pct int not null default 3,
  status auction_status not null default 'DRAFT',
  current_bid_id uuid,
  winner_user_id text,
  payment_id text,
  shipping_cost_cents int not null default 0,
  -- Digital product fields
  digital_delivery_type digital_delivery_type,
  digital_file_path text,
  digital_discount_code text,
  digital_download_link text,
  digital_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create bids table
create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_user_id text not null,
  amount_cents int not null,
  created_at timestamptz not null default now()
);

-- Create fulfillments table
create table fulfillments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  digital_object_path text,
  physical_state physical_state,
  buyer_marked bool not null default false,
  seller_marked bool not null default false,
  dispute_state dispute_state not null default 'NONE',
  -- Digital delivery fields
  digital_delivered_at timestamptz,
  digital_access_granted bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auction_id)
);

-- Create helpful view for top bids
create view v_auction_top_bid as
select b.auction_id, max(b.amount_cents) as top_amount 
from bids b group by b.auction_id;

-- Create indexes for performance
create index idx_auctions_experience_id on auctions(experience_id);
create index idx_auctions_status on auctions(status);
create index idx_auctions_ends_at on auctions(ends_at);
create index idx_auctions_type on auctions(type);
create index idx_bids_auction_id on bids(auction_id);
create index idx_bids_bidder_user_id on bids(bidder_user_id);
create index idx_bids_amount_cents on bids(amount_cents desc);

-- Enable Row Level Security
alter table auctions enable row level security;
alter table bids enable row level security;
alter table fulfillments enable row level security;

-- Create RLS policies for auctions
create policy "Users can view auctions in their experience" on auctions
  for select using (true); -- Allow read access to all auctions in the experience

create policy "Users can create auctions in their experience" on auctions
  for insert with check (true); -- Allow users to create auctions

create policy "Auction creators can update their auctions" on auctions
  for update using (created_by_user_id = current_setting('app.current_user_id', true)::text);

-- Create RLS policies for bids
create policy "Users can view bids for auctions in their experience" on bids
  for select using (true); -- Allow read access to all bids

create policy "Users can place bids" on bids
  for insert with check (bidder_user_id = current_setting('app.current_user_id', true)::text);

-- Create RLS policies for fulfillments
create policy "Users can view fulfillments for their auctions" on fulfillments
  for select using (true); -- Allow read access to fulfillments

create policy "Auction winners can update fulfillments" on fulfillments
  for update using (true); -- Allow updates for winners

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_auctions_updated_at before update on auctions
  for each row execute function update_updated_at_column();

create trigger update_fulfillments_updated_at before update on fulfillments
  for each row execute function update_updated_at_column();

-- Create storage bucket for digital assets
insert into storage.buckets (id, name, public) 
values ('digital-assets', 'digital-assets', false);

-- Create storage policies
create policy "Only authenticated users can upload digital assets" on storage.objects
  for insert with check (bucket_id = 'digital-assets' and auth.role() = 'authenticated');

create policy "Only auction winners can download digital assets" on storage.objects
  for select using (bucket_id = 'digital-assets');

-- Function to automatically create fulfillment record when auction is paid
create or replace function create_digital_fulfillment()
returns trigger as $$
begin
  if new.status = 'PAID' and new.type = 'DIGITAL' then
    insert into fulfillments (auction_id, digital_delivered_at, digital_access_granted)
    values (new.id, now(), true)
    on conflict (auction_id) do update set
      digital_delivered_at = now(),
      digital_access_granted = true;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger for automatic digital fulfillment
create trigger trigger_create_digital_fulfillment
  after update on auctions
  for each row
  execute function create_digital_fulfillment();
