# 🚀 Cron-job.org Setup Guide

## ✅ **Add New Cron Job to Your Existing Setup**

You already have a working cron job setup on cron-job.org. Here's how to add the payment verification:

## **📋 New Cron Job Details**

### **Job Name:** `PaymentVerification`

### **URL:** 
```
https://fdvzkpucafqkguglqgpu.supabase.co/functions/v1/verify-payments
```

### **Method:** `POST`

### **Headers:**
- **Key:** `Authorization`
- **Value:** `Bearer eyJhbGciOiJlUzI1NilsInR5cCl6IkpXVCJ9.eyJpc3MiOiJz...` (same as your existing job)

### **Schedule:** `Every 2 minute(s)`

### **Settings:**
- ✅ **Enable job:** ON
- ❌ **Save responses in job history:** OFF (same as existing)

## **🔧 Step-by-Step Setup**

1. **Go to cron-job.org** and log in
2. **Click "Add cronjob"** or "Create new cronjob"
3. **Fill in the details:**
   - **Title:** `PaymentVerification`
   - **URL:** `https://fdvzkpucafqkguglqgpu.supabase.co/functions/v1/verify-payments`
   - **Method:** `POST`
4. **Add Header:**
   - Click "Headers" section
   - **Key:** `Authorization`
   - **Value:** `Bearer eyJhbGciOiJlUzI1NilsInR5cCl6IkpXVCJ9.eyJpc3MiOiJz...` (copy from your existing job)
5. **Set Schedule:**
   - Select "Every 2 minute(s)"
   - Number: `2`
6. **Settings:**
   - ✅ Enable job: ON
   - ❌ Save responses: OFF
7. **Click "Create"**

## **🎯 What This Does**

### **Every 2 Minutes:**
- Checks for items with `PENDING_PAYMENT` status
- Updates them to `PAID` when payment is confirmed
- Creates winning bid records
- Grants access to digital items
- Updates auction status

### **Complete Flow:**
1. **Auction ends** → `finalize-auctions` (every 5 min)
2. **Payment verification** → `verify-payments` (every 2 min)
3. **Items accessible** → In barracks when paid

## **🧪 Test Your Setup**

### **Manual Test:**
```bash
curl -X POST https://fdvzkpucafqkguglqgpu.supabase.co/functions/v1/verify-payments \
  -H 'Authorization: Bearer eyJhbGciOiJlUzI1NilsInR5cCl6IkpXVCJ9.eyJpc3MiOiJz...'
```

### **Expected Response:**
```json
{
  "message": "Payment verification completed",
  "verified": 0
}
```

## **📊 Monitor Your Jobs**

### **Dashboard:**
- Go to your cron-job.org dashboard
- You should see both jobs:
  - `AuctionEnd` (every 5 minutes)
  - `PaymentVerification` (every 2 minutes)

### **Check Logs:**
- Click on each job to see execution history
- Monitor for any errors or successful runs

## **✅ Result**

Now you have:
- ✅ **Auction finalization** every 5 minutes
- ✅ **Payment verification** every 2 minutes
- ✅ **Automatic barracks updates** when payments are confirmed
- ✅ **Digital item access** immediately after payment
- ✅ **Physical item shipping** management

**Your barracks system is now fully automated!** 🎉
