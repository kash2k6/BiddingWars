#!/bin/bash

# Bidding Wars - Cron Job Setup Script
# This script helps you set up the cron jobs for payment verification

echo "🚀 Setting up Bidding Wars Cron Jobs..."

# Check if CRON_SECRET_KEY is set
if [ -z "$CRON_SECRET_KEY" ]; then
    echo "⚠️  Warning: CRON_SECRET_KEY environment variable is not set"
    echo "   Please set it in your environment or .env file"
    echo "   You can generate one with: openssl rand -base64 32"
fi

echo ""
echo "📋 Cron Jobs to Set Up:"
echo ""
echo "1. Finalize Auctions (every 5 minutes):"
echo "   */5 * * * * curl -X POST https://your-domain.com/api/cron/finalize-auctions \\"
echo "   -H 'Authorization: Bearer $CRON_SECRET_KEY'"
echo ""
echo "2. Verify Payments (every 2 minutes):"
echo "   */2 * * * * curl -X POST https://your-domain.com/api/cron/verify-payments \\"
echo "   -H 'Authorization: Bearer $CRON_SECRET_KEY'"
echo ""
echo "🔧 Setup Instructions:"
echo "1. Replace 'your-domain.com' with your actual domain"
echo "2. Set CRON_SECRET_KEY in your environment"
echo "3. Add these cron jobs to your server's crontab"
echo "4. Test the endpoints manually first"
echo ""
echo "🧪 Test Commands:"
echo "curl -X POST https://your-domain.com/api/cron/finalize-auctions \\"
echo "  -H 'Authorization: Bearer $CRON_SECRET_KEY'"
echo ""
echo "curl -X POST https://your-domain.com/api/cron/verify-payments \\"
echo "  -H 'Authorization: Bearer $CRON_SECRET_KEY'"
echo ""
echo "✅ Setup complete! Make sure to run the barracks-system.sql in your Supabase database first."
