You are Cursor, acting as a senior full‑stack TypeScript engineer. Generate a production‑ready MVP called **Bidding Wars** for **Whop** communities. Use **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase**. Integrate with **Whop’s iFrame context** and payments per the docs referenced below. Deliver a clean, gamified UI with real data wiring.

---

## Objectives

1. Run inside the **Whop Experience view route**: `/experiences/[experienceId]`.
2. On open, read Whop iFrame context and show **Spending Power** (available Whop balance) prominently.
3. Allow **auction listings** (digital/physical) with start price, min increment, buy‑now, countdown, anti‑snipe.
4. Allow **bidding** with realtime updates. At end, collect payment from the **winner** via Whop; funds deduct from Whop Balance first per docs.
5. Split payouts: **Platform fee 3%**, **Community owner % (configurable)**, remainder to **Seller**.
6. **Digital** items: winner can download immediately via signed URL (Supabase Storage). **Physical**: buyer can “Mark Received.”
7. Tabs: **Marketplace**, **My Bids** (In Bid / Won / Lost), **My Auctions**, **Wallet**, **Create Listing**, **Admin**.

---

## Authoritative references (verify names & payloads)

- Whop dev overview + experience/iFrame context + payments: [https://dev.whop.com/introduction](https://dev.whop.com/introduction)
- Public GraphQL & SDK call patterns (headers, rate limits, in‑app purchase flow): [https://dev.whop.com/llms-full.txt](https://dev.whop.com/llms-full.txt)

> IMPORTANT: If a function name I mention differs (e.g., `users.getUserLedgerAccount`, `payments.chargeUser`, or `iframe.inAppPurchase`), use the **actual** name from docs above and adapt types accordingly. Prefer official SDK methods where available; otherwise call the REST/GraphQL endpoints directly with required headers.

---

## Tech choices & setup

- **Next.js 14** (App Router), **TypeScript**.
- **UI:** Tailwind CSS, shadcn/ui, lucide-react icons. Clean, bold cards; big countdowns; obvious action buttons.
- **State/realtime:** Supabase Realtime channels for live bids + countdown ticks (server is source of truth for end time).
- **DB/Storage:** Supabase Postgres + RLS; Supabase Storage bucket `digital-assets/` for digital goods (serve only via signed URLs to winner post‑payment).
- **Whop:** iFrame context for `experienceId`, `userId`, `companyId`. Payments via in‑app purchase/checkout per docs. Use **Whop Balance** first; if insufficient, Whop collects remainder.

---

## File tree (create exactly)

```
.bidding-wars/
  .env.example
  package.json
  next.config.js
  postcss.config.js
  tailwind.config.ts
  prisma/                    # optional if you choose Prisma for local modeling; core DB is Supabase
    schema.prisma
  src/
    app/
      experiences/[experienceId]/layout.tsx
      experiences/[experienceId]/page.tsx           # Marketplace (default tab)
      experiences/[experienceId]/bids/page.tsx      # My Bids (In Bid / Won / Lost)
      experiences/[experienceId]/auctions/page.tsx  # My Auctions (seller)
      experiences/[experienceId]/wallet/page.tsx    # Spending Power, holds
      experiences/[experienceId]/create/page.tsx    # Create Listing flow
      experiences/[experienceId]/admin/page.tsx     # Community owner settings
      api/
        auctions/route.ts
        auctions/[id]/bid/route.ts
        auctions/[id]/finalize/route.ts
        fulfillment/digital/route.ts
        fulfillment/mark-received/route.ts
        checkout/route.ts
        webhooks/whop/route.ts
    components/
      ui/*                        # shadcn components
      SpendingPowerBadge.tsx
      AuctionCard.tsx
      Countdown.tsx
      BidButton.tsx
      BuyNowButton.tsx
      NavTabs.tsx
    lib/
      supabase-server.ts          # server client (service role for RLS bypass on webhooks)
      supabase-client.ts          # browser client
      whop.ts                     # thin wrappers for Whop iFrame + API/SDK
      bids.ts                     # server validators (min increment, anti-snipe)
      payouts.ts                  # fee split math
      auth.ts                     # extract Whop user from request headers/context
  README.md
```

---

## Environment

Create `.env.local` from `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

WHOP_APP_API_KEY=sk_whop_app_...
WHOP_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_WHOP_ENV=production
APP_URL=http://localhost:3000
```

---

## Supabase schema (SQL) — run this migration

```sql
create type auction_status as enum ('DRAFT','LIVE','ENDED','PENDING_PAYMENT','PAID','FULFILLED','CANCELED');
create type auction_type   as enum ('DIGITAL','PHYSICAL');
create type physical_state as enum ('PENDING_SHIP','SHIPPED','DELIVERED');
create type dispute_state  as enum ('NONE','OPEN','RESOLVED','REFUNDED');

create table auctions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null,
  created_by_user_id text not null,
  title text not null,
  description text not null,
  images jsonb not null,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_user_id text not null,
  amount_cents int not null,
  created_at timestamptz not null default now()
);

create table fulfillments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  digital_object_path text,
  physical_state physical_state,
  buyer_marked bool not null default false,
  seller_marked bool not null default false,
  dispute_state dispute_state not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auction_id)
);

create view v_auction_top_bid as
select b.auction_id, max(b.amount_cents) as top_amount from bids b group by b.auction_id;
```

**RLS recommendations**

- `auctions`: Allow read to users whose `experience_id` matches iFrame context; write for `created_by_user_id` or community admin.
- `bids`: Allow insert/read where `experience_id` matches and `bidder_user_id` equals current user.
- Use **service role** in server/webhook routes.

**Storage**

- Bucket `digital-assets/` (private). Store **paths** only; serve signed URLs to winners after payment.

---

## Whop integration (adapt names to docs)

**iFrame context**

- Client: on mount, call iFrame SDK to get `{ userId, experienceId, companyId }`.
- Pass these to server in requests (headers or body). Server verifies with `x-whop-user-token` if available.

**Spending Power**

- Query the user’s ledger via Whop SDK/GraphQL (e.g., `users.getUserLedgerAccount` or equivalent). Compute `available = balance − pendingBalance`. Show as a pill/badge in top‑right and in **Wallet** tab.

**Bidding**

- `POST /api/auctions/:id/bid`: server validates min increment and anti‑snipe (extend `ends_at` if within threshold). Persist bid; broadcast via Supabase Realtime.

**Finalize + Payment**

- When `ends_at` passes (cron/queue) or Buy‑Now clicked:
  1. Compute winner & amount (top bid + shipping).
  2. Server creates a charge (e.g., `payments.chargeUser`) with metadata `{ auctionId, experienceId, platformPct, communityPct, sellerUserId }`.
  3. Return **in‑app purchase** payload to client; open Whop modal (e.g., `iframe.inAppPurchase(iap)`), which deducts from **Whop Balance** first.
  4. Webhook `payment.succeeded` → mark `PAID`, store `payment_id`.

**Payouts**

- After `PAID`, compute splits: platform 3%, community %, seller remainder. Issue transfers via Whop (e.g., `payments.payUser`) from your company ledger. Persist a payout ledger in Supabase for reconciliation.

---

## UI/UX

- **Top bar:** breadcrumb to community, search, filters (Digital/Physical, Ending Soon, Hot), **Spending Power** pill, avatar.
- **Marketplace cards:** large **Countdown**, current top bid, next bid step, Buy‑Now badge, seller chip, community % badge, Bid/Buy‑Now buttons.
- **My Bids:** tabs **In Bid / Won / Lost**, rows show your bid vs. current top + quick “+min increment”.
- **My Auctions:** tabs **Live / Ended / Pending Payment / Paid / Fulfilled** with actions (end early if no bids, mark shipped, issue refund if allowed).
- **Wallet:** Spending Power, pending holds; CTA **Add Funds** (open Whop add‑funds/checkout per docs).
- **Create Listing:** simple wizard with preview + fee breakdown.
- Use shadcn Cards, Buttons, Badges; smooth micro‑animations.

---

## API contracts

```
POST /api/auctions
  body: { experienceId, title, description, images[], type, startsAt, endsAt, startPriceCents, minIncrementCents, buyNowPriceCents?, communityPct, shippingCostCents }

POST /api/auctions/:id/bid
  body: { amountCents }
  response: { ok: true, nextMinCents }

POST /api/auctions/:id/finalize
  body: { } -> picks winner, sets PENDING_PAYMENT, returns iap payload OR { checkoutSession } to client

POST /api/checkout
  body: { userId, experienceId, amountCents, auctionId }
  response: { inAppPurchasePayload }

POST /api/webhooks/whop
  body: Whop event; on payment.succeeded -> mark PAID, create fulfillment record, enqueue payouts

POST /api/fulfillment/digital
  body: { auctionId, storagePath } -> stores path

POST /api/fulfillment/mark-received
  body: { auctionId } -> buyer confirms physical receipt
```

---

## Components to implement

- `SpendingPowerBadge` — fetch ledger, compute available, render `$0.00` if missing.
- `Countdown` — HH\:MM\:SS, ticks client‑side; server authoritative on finalize.
- `AuctionCard` — image, title, chip (Digital/Physical), top bid, Buy‑Now badge, countdown, Bid/Buy buttons.
- `BidButton` — posts next valid amount; handles errors (low\_bid, not\_live).
- `BuyNowButton` — locks listing, calls finalize then opens Whop modal.
- `NavTabs` — tabs for Marketplace/My Bids/My Auctions/Wallet/Create/Admin.

---

## Fee split math (payouts.ts)

```
inputs: { saleCents, platformPct=3, communityPct }
platform = floor(saleCents * platformPct/100)
community = floor(saleCents * communityPct/100)
seller = saleCents - platform - community
```

---

## Acceptance criteria

-

---

## Developer notes

- Never trust client bid totals; always recompute on server using latest DB state.
- If Whop supports **pre‑authorization/holds** on bids, implement; otherwise only charge the winner on finalize.
- Use rate‑limit friendly patterns per GraphQL notes in `llms-full.txt`; batch when feasible.
- Keep all Whop method names in a single `lib/whop.ts` wrapper so updates are isolated.

Now, generate the full codebase and stubs per this spec. If a Whop SDK symbol is missing or renamed, consult the two URLs above and adapt. Output files to the paths listed in the tree.

