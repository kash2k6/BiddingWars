#!/bin/bash

echo "🚀 Setting up BiddingWars Cron Job"
echo "=================================="

# Supabase Edge Function URL
EDGE_FUNCTION_URL="https://fdvzkpucafqkguglqgpu.supabase.co/functions/v1/finalize-auctions"

# Service role key (you'll need to add this)
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdnprcHVjYWZxa2d1Z2xxZ3B1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwNTEzNiwiZXhwIjoyMDcwNDgxMTM2fQ.A1H-VUcNlagHFMgr0m_7a4Dg7kBq8FoGYfsrUh8NeVk"

echo "✅ Supabase Edge Function URL: $EDGE_FUNCTION_URL"
echo ""

echo "🧪 Testing Edge Function..."
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -s | jq .

echo ""
echo "📋 Next Steps:"
echo "1. Go to https://cron-job.org"
echo "2. Create a new cron job"
echo "3. Set URL to: $EDGE_FUNCTION_URL"
echo "4. Set method to: POST"
echo "5. Add header: Authorization: Bearer $SERVICE_ROLE_KEY"
echo "6. Set schedule to: Every 5 minutes"
echo "7. Save and activate"

echo ""
echo "🔍 Monitor the cron job:"
echo "- Supabase Dashboard: https://supabase.com/dashboard/project/fdvzkpucafqkguglqgpu/functions"
echo "- Check function logs for execution details"
echo "- Monitor auction status changes in your app"
