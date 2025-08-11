# Bidding Wars — Supabase MVP (Whop + Experience Route)

An actionable v1 spec you can paste into Cursor and build from. Storage is **Supabase** (Postgres + Auth + Storage). Whop is the **authN/authZ and payments** layer. This version uses the **Experience view route** and shows **spending power (Whop balance)** on open.

---

## 1) App views & routing

- **Experience View (primary UI)**: `/experiences/[experienceId]`
  - Shown inside Whop after the community installs your app.
  - Access is gated by the Whop iFrame SDK; pull `experienceId`, `userId`, `companyId`.
- **Discover View (public marketing, optional)**: `/discover`
  - Show examples, success stories, and deep links to Whops using your app.

**Desired tabs in Experience view**

1. **Marketplace** (live auctions, filters, timers)
2. **My Bids** (status buckets: *In Bid*, *Won*, *Lost*)
3. **My Auctions** (seller dashboard)
4. **Wallet** (Spending Power = available Whop balance; link to add funds if needed)
5. **Create Listing** (seller flow)
6. **Admin** (community owner: fee %, moderation, reports)

---

## 2) UI wire (clean + gamified)

**Top bar**

- Left: App name + community route (breadcrumb)
- Center: global search (by title/creator), quick filters (Digital/Physical, Ending Soon, Hot)
- Right: **Spending Power** badge (e.g., `$127.40`) and avatar menu

**Marketplace cards**

- Large timer (HH\:MM\:SS), current bid, Buy‑Now badge if available
- Seller chip + community fee preview
- One‑tap **Bid** (next valid step auto‑calc), **Buy‑Now** (if set)

**My Bids**

- Tabs: **In Bid**, **Won**, **Lost**
- Each row: title, your highest bid, current top bid, ends in, quick “increase bid”

**My Auctions**

- Tabs: **Live**, **Ended**, **Pending Payment**, **Paid**, **Fulfilled**
- Quick actions: end early (no bids), edit description, issue refund (if allowed), mark shipped

**Wallet**

- Shows **Spending Power** (available balance) and pending holds
- CTA: “Add Funds” (opens Whop modal or checkout link)

---

## 3) Supabase schema (SQL)

```sql
-- Auctions are scoped to a Whop Experience and created by a Whop User
create type auction_status as enum ('DRAFT','LIVE','ENDED','PENDING_PAYMENT','PAID','FULFILLED','CANCELED');
create type auction_type   as enum ('DIGITAL','PHYSICAL');
create type physical_state as enum ('PENDING_SHIP','SHIPPED','DELIVERED');
create type dispute_state  as enum ('NONE','OPEN','RESOLVED','REFUNDED');

create table auctions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null,             -- Whop experienceId
  created_by_user_id text not null,        -- Whop user id
  title text not null,
  description text not null,
  images jsonb not null,                   -- array of URLs
  type auction_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  anti_snipe_sec int not null default 120,
  buy_now_price_cents int,                 -- nullable
  start_price_cents int not null,
  min_increment_cents int not null,
  currency text not null default 'usd',
  community_pct int not null,              -- 0..100
  platform_pct int not null default 3,     -- your fee
  status auction_status not null default 'DRAFT',
  current_bid_id uuid,
  winner_user_id text,
  payment_id text,                         -- Whop pay_***
  shipping_cost_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_user_id text not null,                  -- Whop user id
  amount_cents int not null,
  created_at timestamptz not null default now()
);

create table fulfillments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  digital_object_path text,                       -- Supabase Storage path (signed URL on demand)
  physical_state physical_state,
  buyer_marked bool not null default false,
  seller_marked bool not null default false,
  dispute_state dispute_state not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auction_id)
);

-- Helpful views
create view v_auction_top_bid as
select b.auction_id, max(b.amount_cents) as top_amount
from bids b group by b.auction_id;
```

**RLS (recommended)**

- Scope reads/writes by `experience_id` and `created_by_user_id` / `bidder_user_id` (you’ll pass these from iFrame context on the server).
- Admin bypass for your service role key.

**Storage**

- Bucket `digital-assets/` for uploaded files. Store **paths only** in DB and serve **signed URLs** to the **winner** after `PAID`.

---

## 4) Whop integration points

**iFrame context (client)**

- On app load in Experience view, call Whop SDK to get `{ userId, experienceId, companyId }`.
- Show **Spending Power** by calling `users.getUserLedgerAccount()` and deriving available = `balance - pendingBalance`.

**Creating a charge (server)**

- On auction end or Buy‑Now, your server creates a charge for the **winner** using Whop’s SDK (`payments.chargeUser`).
- Return the `inAppPurchase` payload to client, then open the **Whop modal** via iFrame SDK (`iframeSdk.inAppPurchase(...)`).
- Whop deducts from user’s Whop Balance first; if insufficient, collects remaining by card/rails.

**Webhooks (server)**

- Handle `payment.succeeded` → set auction to `PAID`, store `payment_id`, generate signed URL for digital goods, or notify seller to ship.
- Optionally handle `refund.updated`/disputes → update `fulfillments.dispute_state`.

**Payouts / splits**

- After `PAID`, compute **platform 3%**, **community %**, **seller remainder**.
- Use `payments.payUser` to transfer the community/seller shares from your company ledger; track transfers on your ledger for reconciliation.

---

## 5) Key flows

### A. Open app → show Spending Power

1. Client fetches ledger via Whop SDK → display **Spending Power**.
2. If pending balances exist, show tooltip: `Available = balance - pending`.

### B. Create listing (seller)

1. Seller completes form; server writes to Supabase with `experience_id` and `created_by_user_id` from iFrame context.
2. Auction starts immediately or at `starts_at`.

### C. Bid

1. Client posts to `/api/auctions/:id/bid` with desired amount.
2. Server validates:
   - status = LIVE, `amount >= top + min_increment`
   - extend `ends_at` if within `anti_snipe_sec` window
3. Persist bid; emit realtime update (Supabase Realtime) to other viewers.

### D. End auction → payment

1. Cron/queue detects `ends_at` → picks top bid and marks auction `PENDING_PAYMENT` with `winner_user_id`.
2. Server creates Whop charge (amount = top bid + shipping) with metadata `{ auctionId, experienceId, platformPct, communityPct, sellerUserId }`.
3. Client (winner) opens modal and completes payment.
4. Webhook `payment.succeeded` → mark `PAID`, store `payment_id`, trigger delivery.

### E. Delivery

- **Digital**: generate short‑lived signed URL from Supabase Storage; show **Download** button to winner only.
- **Physical**: expose buyer shipping details to seller; buyer can **Mark Received** (updates `buyer_marked=true`). If not marked in X days → open dispute.

---

## 6) API surface (Next.js App Router example)

```
POST /api/auctions                 # create auction
POST /api/auctions/:id/bid         # place bid (server validates + anti-snipe)
POST /api/auctions/:id/finalize    # choose winner, create charge (PENDING_PAYMENT)
POST /api/checkout                 # returns inAppPurchase for a user+auction
POST /api/webhooks/whop            # handle payment.succeeded / refund.updated
POST /api/fulfillment/digital      # create signed URL for winner
POST /api/fulfillment/mark-received# buyer confirms physical delivery
```

**Headers & auth**

- From Whop iFrame request, read `x-whop-user-token` on server to verify and extract `userId`.
- Use your **App API key** for server‑to‑server calls.

---

## 7) Minimal code stubs (Cursor‑ready)

**Get iFrame context (client)**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useIframeSdk } from "@whop/react";

type Ctx = { userId: string; experienceId: string; companyId?: string };

export function UseWhopContext() {
  const iframe = useIframeSdk();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  useEffect(() => { (async () => {
    const c = await iframe.getContext();
    setCtx({ userId: c.userId, experienceId: c.experienceId, companyId: c.companyId });
  })(); }, [iframe]);
  return ctx;
}
```

**Show Spending Power (client)**

```tsx
"use client";
import { useEffect, useState } from "react";
import { whopSdk } from "@/lib/whop-sdk"; // thin wrapper around Whop SDK client

export function SpendingPower() {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => { (async () => {
    const res = await whopSdk.users.getUserLedgerAccount();
    const usdNode = res.user.ledgerAccount?.balanceCaches?.nodes?.find(n => n.currency === 'usd');
    if (usdNode) {
      const available = (usdNode.balance ?? 0) - (usdNode.pendingBalance ?? 0);
      setUsd(available);
    }
  })(); }, []);
  return <div className="rounded-xl px-3 py-2 bg-neutral-900 text-white">Spending Power: ${((usd ?? 0)/100).toFixed(2)}</div>;
}
```

**Create charge (server)**

```ts
// app/api/checkout/route.ts
import { NextRequest } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export async function POST(req: NextRequest) {
  const { userId, experienceId, amountCents, auctionId, meta } = await req.json();
  const result = await whopSdk.payments.chargeUser({
    amount: amountCents,
    currency: 'usd',
    userId,
    metadata: { auctionId, experienceId, ...meta }
  });
  if (!result?.inAppPurchase) return Response.json({ error: 'no_in_app_purchase' }, { status: 500 });
  return Response.json(result.inAppPurchase);
}
```

**Open Whop modal (client)**

```tsx
"use client";
import { useState } from "react";
import { useIframeSdk } from "@whop/react";

export function PayNowButton({ userId, experienceId, amountCents, auctionId }: any) {
  const iframe = useIframeSdk();
  const [receipt, setReceipt] = useState<string | null>(null);

  async function onPay() {
    const res = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ userId, experienceId, amountCents, auctionId }) });
    const iap = await res.json();
    const out = await iframe.inAppPurchase(iap);
    if (out.status === 'ok') setReceipt(out.data.receipt_id);
  }

  return <button className="btn-primary" onClick={onPay}>Pay Now</button>;
}
```

**Webhook (server)**

```ts
// app/api/webhooks/whop/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const evt = await req.json();
  if (evt.type === 'payment.succeeded') {
    const { auctionId, experienceId, platformPct, communityPct, sellerUserId } = evt.data.metadata || {};
    // 1) mark auction PAID
    // 2) create fulfillment record
    // 3) compute splits and queue payouts (payUser) from your company ledger
  }
  return Response.json({ ok: true });
}
```

---

## 8) Build order

1. Supabase: create DB tables, enable RLS, create service role key, create `digital-assets` bucket.
2. Next.js app shell: Experience route, iFrame context, Spending Power widget.
3. Auctions CRUD + bid endpoint with anti‑snipe (server‑side validation only).
4. Realtime (Supabase Realtime) for bids + timers.
5. Finalize → chargeUser → inAppPurchase modal → webhook → mark `PAID`.
6. Digital delivery (signed URL) & physical confirmation + dispute flow.
7. Admin dashboards (community % + reports) + monthly payout reconciliation.

---

## 9) Notes & guardrails

- **Timers**: Server time is source of truth; always validate bids against latest state.
- **No client‑side trust**: Never accept a winning amount from the client; recompute on server.
- **Fees**: Show fee breakdown pre‑listing and on payment confirmation.
- **Security**: Never store raw file URLs; use signed URLs for winners. Verify `x-whop-user-token` for server actions.
- **Compliance**: Physical items require receive/ship confirmations; digital downloads should be single‑use links with short TTL.

