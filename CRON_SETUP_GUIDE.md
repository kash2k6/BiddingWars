# 🚀 Cron Job Setup Guide

## ✅ **You're All Set!**

Since you already have `CRON_SECRET_KEY=biddingwars876-secret-cron-key-2024`, you have **two easy options**:

## **Option 1: Vercel Built-in Cron (Recommended)**

Your `vercel.json` now includes:
```json
{
  "crons": [
    {
      "path": "/api/cron/finalize-auctions",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/verify-payments", 
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Just deploy to Vercel and it's automatic!** 🎉

## **Option 2: Add to Your Existing Cron Service**

If you're using cron-job.org or similar, add this new job:

- **URL**: `https://your-domain.vercel.app/api/cron/verify-payments`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer biddingwars876-secret-cron-key-2024`
- **Schedule**: `Every 2 minutes (*/2 * * * *)`

## **🧪 Test Your Setup**

Test the endpoints manually:

```bash
# Test finalize auctions
curl -X POST https://your-domain.vercel.app/api/cron/finalize-auctions \
  -H 'Authorization: Bearer biddingwars876-secret-cron-key-2024'

# Test verify payments  
curl -X POST https://your-domain.vercel.app/api/cron/verify-payments \
  -H 'Authorization: Bearer biddingwars876-secret-cron-key-2024'
```

## **📋 What Each Cron Job Does**

### **Finalize Auctions (Every 5 minutes)**
- Finds ended auctions
- Creates Whop charges (no auto-charge)
- Adds items to barracks with `PENDING_PAYMENT` status
- Sends notifications

### **Verify Payments (Every 2 minutes)**
- Checks `PENDING_PAYMENT` items
- Queries Whop API for payment status
- Updates status to `PAID` when confirmed
- Grants access to digital items
- Resets failed payments

## **🎯 Result**

- ✅ No need for cron-job.org
- ✅ Uses your existing `CRON_SECRET_KEY`
- ✅ Automatic payment verification
- ✅ Digital items accessible immediately after payment
- ✅ Physical items with shipping management

**Just deploy and you're done!** 🚀
