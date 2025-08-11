# 🏆 Bidding Wars - Whop Community Auction Platform

A gamified auction platform built for Whop communities, featuring real-time bidding, push notifications, and seamless payment integration.

## ✨ Features

### 🎮 Core Auction System
- **Real-time bidding** with live updates
- **Anti-snipe protection** with automatic time extensions
- **Buy Now** functionality for instant purchases
- **Digital & Physical** product support
- **Image uploads** with Supabase Storage
- **Countdown timers** with gamified effects

### 🔔 Smart Notifications
- **Push notifications** via Whop's notification system
- **Bid alerts** when you're outbid
- **Auction end** notifications for winners and sellers
- **Payment completion** confirmations
- **Shipping status** updates

### 💬 Community Features
- **Live chat** on auction detail pages
- **Real-time messaging** between bidders and sellers
- **Community fee** system for community owners
- **Admin dashboard** with analytics

### 🚚 Fulfillment System
- **Digital delivery** with secure download links
- **Physical shipping** with tracking
- **Mark as shipped/received** functionality
- **Dispute resolution** system

### 📊 Analytics & Admin
- **Auction statistics** and performance metrics
- **Revenue tracking** for community owners
- **User activity** monitoring
- **Payment processing** with commission splits

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Storage, Realtime)
- **Authentication:** Whop iFrame SDK
- **Payments:** Whop Payment API
- **Notifications:** Whop Push Notification API
- **Deployment:** Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Whop developer account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kash2k6/BiddingWars.git
   cd BiddingWars
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Whop Configuration
   NEXT_PUBLIC_WHOP_APP_ID=your-whop-app-id
   WHOP_API_KEY=your-whop-api-key
   NEXT_PUBLIC_WHOP_COMPANY_ID=your-company-id
   NEXT_PUBLIC_WHOP_EXPERIENCE_ID=your-experience-id
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   
   # Cron Configuration
   CRON_SECRET_KEY=your-cron-secret-key
   ```

4. **Set up database**
   - Go to your Supabase SQL Editor
   - Run the contents of `setup-missing-features.sql`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Run the complete setup script
-- Copy and paste the contents of setup-missing-features.sql
```

This will create:
- Auctions table with digital/physical support
- Bids table with real-time capabilities
- Fulfillments table for delivery tracking
- Chat system for auction pages
- Dispute resolution system
- Analytics tracking

## 🔧 Configuration

### Whop Integration
1. Create a Whop app at [dev.whop.com](https://dev.whop.com)
2. Set your app URL to your deployment domain
3. Configure webhooks for payment events
4. Set up push notifications

### Supabase Setup
1. Create a new Supabase project
2. Enable Row Level Security (RLS)
3. Create storage buckets for images and digital assets
4. Set up real-time subscriptions

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure custom domain (optional)
4. Set up cron jobs for auction finalization

## 🎯 Key Features Explained

### Real-time Bidding
- Live bid updates using Supabase Realtime
- Anti-snipe protection extends auction time
- Automatic winner selection when auction ends

### Payment Processing
- Whop Balance integration
- Commission splitting (Platform 3%, Community %, Seller remainder)
- Automatic payouts to community owners and sellers

### Digital Product Delivery
- Secure file uploads to Supabase Storage
- Signed URLs for secure downloads
- Automatic fulfillment for digital items

### Physical Product Fulfillment
- Shipping address management
- Tracking number support
- Mark as shipped/received workflow

## 📱 Mobile Responsive

The platform is fully responsive and optimized for:
- Desktop browsers
- Mobile devices
- Tablet screens
- Whop mobile app integration

## 🔒 Security Features

- Row Level Security (RLS) on all database tables
- JWT token validation for user authentication
- Secure file uploads with validation
- Payment verification through Whop webhooks

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

### Environment Variables for Production
```env
NEXT_PUBLIC_WHOP_APP_ID=app_eqkXJuWAoUaoJl
WHOP_API_KEY=your-production-whop-api-key
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_PHQfLZ3o2GvXQn
NEXT_PUBLIC_WHOP_EXPERIENCE_ID=exp_hxtkjfMPOH3rWW
CRON_SECRET_KEY=your-secure-cron-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation:** Check the code comments and SQL files
- **Issues:** Create an issue on GitHub
- **Whop Docs:** [dev.whop.com](https://dev.whop.com)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Supabase](https://supabase.com/)
- Integrated with [Whop](https://whop.com/)

---

**Made with ❤️ for the Whop community**
