# Webhook Setup Guide

## Setting up Webhooks in Whop Dashboard

To properly handle payment confirmations, you need to set up webhooks in your Whop dashboard:

### 1. Go to Your App Dashboard
- Visit [dev.whop.com](https://dev.whop.com)
- Navigate to your app
- Go to the "Webhooks" section

### 2. Create a New Webhook
- Click "Create Webhook"
- Set the following:
  - **Event Type**: `payment.succeeded`
  - **URL**: `https://your-app-domain.vercel.app/api/webhooks/whop`
  - **API Version**: `v5`

### 3. Copy the Webhook Secret
- After creating the webhook, copy the webhook secret
- Add it to your environment variables as `WHOP_WEBHOOK_SECRET`

### 4. Update Environment Variables

#### For Vercel Production:
1. Go to your Vercel project settings
2. Add environment variable: `WHOP_WEBHOOK_SECRET=your_webhook_secret_here`

#### For Local Development:
1. Add to your `.env.local` file:
```
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
```

### 5. Test the Webhook
- Make a test payment in your app
- Check the webhook logs in your Whop dashboard
- Verify that the barracks item status is updated to "PAID"

## How It Works

### Payment Flow
**Important**: Users do NOT pay when they bid. They only pay when they **win** an auction or use **"Buy It Now"**.

### Auction Win Payment
1. **Auction ends**: When an auction ends, the winner needs to pay
2. **Winner pays**: The winner clicks "Pay it Now" to complete the purchase
3. **Payment processed**: Whop processes the payment through their system
4. **Webhook sent**: Whop sends a `payment.succeeded` webhook to your app
5. **App updates**: Your app receives the webhook and:
   - Updates the barracks item status to "PAID"
   - Updates the auction status to "PAID"
   - Creates a winning_bid record
   - **Automatically processes payouts** to seller and community owner
   - Calculates commission breakdown (platform fee + community fee + seller amount)
6. **User notified**: The winner receives a push notification confirming they won the auction

### Buy It Now Payment
1. **User clicks "Buy It Now"**: User purchases item immediately at the buy now price
2. **Payment processed**: Whop processes the payment through their system
3. **Webhook sent**: Whop sends a `payment.succeeded` webhook to your app
4. **App updates**: Your app receives the webhook and:
   - Updates the barracks item status to "PAID"
   - Updates the auction status to "PAID"
   - Creates a winning_bid record
   - **Automatically processes payouts** to seller and community owner
   - Calculates commission breakdown (platform fee + community fee + seller amount)
5. **User notified**: The user receives a push notification confirming their purchase

## Automatic Payout System

The webhook automatically handles payouts when payments are confirmed:

### Commission Breakdown
- **Platform Fee**: $1 flat for items under $50, then $1 + 3% for items $50+ - goes to your business ledger
- **Community Fee**: 5% (default) - goes to the community owner
- **Seller Amount**: Remaining amount - goes to the auction creator

### Payout Process
1. **Payment confirmed** → Webhook receives `payment.succeeded`
2. **Calculate breakdown** → Using your percentage system
3. **Pay community owner** → Via Whop's `payUser` API
4. **Pay seller** → Via Whop's `payUser` API
5. **Platform fee retained** → Stays in your business ledger

### Configuration
- Platform and community percentages can be set per auction
- Defaults: 3% platform, 5% community
- All payouts use idempotence keys to prevent duplicates

## Webhook Event Structure

The webhook handles two types of payments:

### 1. Auction Win Payment
When someone wins an auction and pays:
```json
{
  "event": "payment.succeeded",
  "data": {
    "receipt_id": "rec_1234567890",
    "final_amount": 50.00,
    "amount_after_fees": 47.50,
    "currency": "usd",
    "user_id": "user_1234567890",
    "metadata": {
      "auctionId": "auction_123",
      "type": "auction_win",
      "experienceId": "exp_123",
      "bidId": "bid_123"
    }
  }
}
```

### 2. Buy It Now Payment
When someone uses "Buy It Now":
```json
{
  "event": "payment.succeeded",
  "data": {
    "receipt_id": "rec_1234567890",
    "final_amount": 75.00,
    "amount_after_fees": 71.25,
    "currency": "usd",
    "user_id": "user_1234567890",
    "metadata": {
      "auctionId": "auction_123",
      "type": "buy_now",
      "experienceId": "exp_123"
    }
  }
}
```

## Troubleshooting

- **Webhook not received**: Check that the URL is correct and publicly accessible
- **Invalid signature**: Verify the webhook secret is correct
- **Database errors**: Check that the barracks item exists and is in PENDING_PAYMENT status
- **Push notification fails**: Verify the user has notifications enabled
