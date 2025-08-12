"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"
import { getIframeContext, createInAppPurchase } from "@/lib/whop-client"
import { AuctionCard } from "@/components/AuctionCard"
import { LiveFeed } from "@/components/LiveFeed"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/payouts"
import { useToast } from "@/hooks/use-toast"

interface Auction {
  id: string
  title: string
  description: string
  images: string[]
  type: 'DIGITAL' | 'PHYSICAL'
  starts_at: string
  ends_at: string
  buy_now_price_cents?: number
  start_price_cents: number
  min_increment_cents: number
  community_pct: number
  status: string
  current_bid_id?: string
  winner_user_id?: string
  shipping_cost_cents: number
  created_by_user_id: string
  experience_id: string
}

export default function MarketplacePage({ params }: { params: { experienceId: string } }) {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [currentBids, setCurrentBids] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function getContext() {
      try {
        const ctx = await getWhopContext()
        console.log('Whop context received:', ctx)
        
        // Extract actual user ID from JWT if needed
        let actualUserId = ctx.userId
        if (ctx.userId.includes('.')) {
          try {
            const payload = JSON.parse(Buffer.from(ctx.userId.split('.')[1], 'base64').toString())
            actualUserId = payload.sub
            console.log('Extracted user ID from JWT for Marketplace:', actualUserId)
          } catch (error) {
            console.log('Failed to parse JWT, using as-is:', ctx.userId)
          }
        }
        
        console.log('Setting currentUserId to:', actualUserId)
        setCurrentUserId(actualUserId)
        setCurrentCompanyId(ctx.companyId || null)
      } catch (error) {
        console.error("Failed to get Whop context:", error)
      }
    }

    getContext()
  }, [])

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const { data, error } = await supabaseClient
          .from('auctions')
          .select('*')
          .eq('experience_id', params.experienceId)
          .eq('status', 'LIVE')
          .order('created_at', { ascending: false })

        if (error) throw error

        setAuctions(data || [])

        // Fetch current bids for each auction
        const bidsData: Record<string, number> = {}
        for (const auction of data || []) {
          const { data: topBid } = await supabaseClient
            .from('bids')
            .select('amount_cents')
            .eq('auction_id', auction.id)
            .order('amount_cents', { ascending: false })
            .limit(1)
            .single()

          if (topBid) {
            bidsData[auction.id] = topBid.amount_cents
          }
        }
        setCurrentBids(bidsData)
      } catch (error) {
        console.error('Error fetching auctions:', error)
        toast({
          title: "Error",
          description: "Failed to load auctions",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAuctions()
  }, [params.experienceId, toast])

  // Subscribe to real-time updates
  useEffect(() => {
    if (auctions.length === 0) return

    console.log('Setting up real-time subscription for auctions:', auctions.map(a => a.id))
    
    const channel = supabaseClient
      .channel('auction-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bids',
          filter: `auction_id=in.(${auctions.map(a => a.id).join(',')})`
        }, 
        (payload) => {
          console.log('Real-time bid update received:', payload)
          if (payload.eventType === 'INSERT') {
            const newBid = payload.new as any
            console.log('New bid detected:', newBid)
            setCurrentBids(prev => {
              const updated = {
                ...prev,
                [newBid.auction_id]: newBid.amount_cents
              }
              console.log('Updated current bids:', updated)
              return updated
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
      })

    return () => {
      console.log('Cleaning up real-time subscription')
      supabaseClient.removeChannel(channel)
    }
  }, [auctions])

  const handleBid = async (auctionId: string, amount: number) => {
    try {
      // Get the current Whop context
      const contextResponse = await fetch('/api/whop-context')
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()

      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amountCents: amount,
          userId: context.userId,
          experienceId: context.experienceId,
          companyId: context.companyId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bid')
      }

      console.log('Bid successful, updating UI...')
      
      // Update local state immediately
      setCurrentBids(prev => {
        const updated = {
          ...prev,
          [auctionId]: amount
        }
        console.log('Updated current bids after successful bid:', updated)
        return updated
      })

      toast({
        title: "Bid Placed! 🎯",
        description: `Your bid of ${formatCurrency(amount)} has been deployed successfully!`,
      })
      
      // Refresh auctions data to get updated information
      const { data: updatedAuctions } = await supabaseClient
        .from('auctions')
        .select('*')
        .eq('experience_id', params.experienceId)
        .eq('status', 'LIVE')
        .order('created_at', { ascending: false })

      if (updatedAuctions) {
        setAuctions(updatedAuctions)
      }
    } catch (error) {
      console.error('Error placing bid:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place bid",
        variant: "destructive",
      })
    }
  }

  const handleBuyNow = async (auctionId: string) => {
    try {
      // Find the auction to get the buy now price
      const auction = auctions.find(a => a.id === auctionId)
      if (!auction || !auction.buy_now_price_cents) {
        throw new Error('Buy now not available for this auction')
      }

      // First, process the payment
      const context = await getIframeContext()
      
      // Create charge for buy now purchase
      const chargeResponse = await fetch("/api/charge", {
        method: "POST",
        body: JSON.stringify({ 
          userId: context.userId, 
          experienceId: context.experienceId,
          amount: auction.buy_now_price_cents,
          currency: 'usd',
          metadata: {
            auctionId: auction.id,
            type: 'buy_now_purchase'
          }
        }),
      })
      
      if (!chargeResponse.ok) {
        throw new Error("Failed to create charge")
      }
      
      const chargeResult = await chargeResponse.json()
      
      // Open payment modal using the inAppPurchase object
      const res = await createInAppPurchase(chargeResult.inAppPurchase)
      
      if (!res.success) {
        if (res.error) {
          throw new Error(res.error)
        }
        throw new Error('Payment failed')
      }
      
      // Show feedback about payment window
      if (res.paymentUrl) {
        toast({
          title: "Payment Required",
          description: "Please complete your payment in the new window that opened. Close this window after payment.",
        })
      }

      // Now finalize the auction
      const finalizeResponse = await fetch(`/api/auctions/${auctionId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          experienceId: params.experienceId,
          companyId: currentCompanyId,
          buyNow: true,
          amount: auction.buy_now_price_cents
        })
      })

      const result = await finalizeResponse.json()

      if (!finalizeResponse.ok) {
        throw new Error(result.error || 'Failed to finalize purchase')
      }
      
      toast({
        title: "Purchase Complete!",
        description: "You have successfully purchased this item.",
      })

      // Refresh the page to update the UI
      window.location.reload()
    } catch (error) {
      console.error('Error buying now:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete purchase",
        variant: "destructive",
      })
    }
  }

  const handleMarkReceived = async (auctionId: string) => {
    try {
      const contextResponse = await fetch('/api/whop-context')
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()

      const response = await fetch('/api/fulfillment/mark-received', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auctionId,
          userId: context.userId,
          experienceId: context.experienceId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as received')
      }

      toast({
        title: "Item Marked as Received!",
        description: "Thank you for confirming receipt of your item.",
      })

      // Refresh the page to update the UI
      window.location.reload()
    } catch (error) {
      console.error('Error marking as received:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to mark as received',
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              🔥 LIVE AUCTIONS 🔥
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 font-semibold">LIVE</span>
            </div>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold">
            {auctions.length} ACTIVE AUCTIONS
          </Badge>
        </div>

        {auctions.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No active auctions</h3>
            <p className="text-muted-foreground mb-4">
              Check back later or create your own auction!
            </p>
            <Button asChild>
              <a href={`/experiences/${params.experienceId}/create`}>
                Create Auction
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                currentBid={currentBids[auction.id]}
                currentBids={currentBids}
                onBid={handleBid}
                onBuyNow={handleBuyNow}
                onMarkReceived={handleMarkReceived}
                currentUserId={currentUserId || undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar with Live Feed */}
      <div className="lg:col-span-1 space-y-6">
        <LiveFeed 
          experienceId={params.experienceId}
          currentUserId={currentUserId || undefined}
          maxItems={20}
        />
      </div>
    </div>
  )
}
