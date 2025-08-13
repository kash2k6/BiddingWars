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
  const [pastAuctions, setPastAuctions] = useState<Auction[]>([])
  const [currentBids, setCurrentBids] = useState<Record<string, number>>({})
  const [userNames, setUserNames] = useState<Record<string, string>>({})
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

  // Check for payment success message in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const paymentSuccess = urlParams.get('payment_success')
      const paymentType = urlParams.get('type')
      const auctionId = urlParams.get('auctionId')
      
      if (paymentSuccess === 'true') {
        if (paymentType === 'auction_win') {
          toast({
            title: "🎉 Auction Won!",
            description: "Congratulations! You won the auction. Your payment is being processed.",
          })
        } else if (paymentType === 'auction_payment') {
          toast({
            title: "✅ Payment Successful!",
            description: "Your auction payment has been processed. The item will be available shortly once verified.",
          })
        } else if (paymentType === 'buy_now_purchase') {
          toast({
            title: "🎉 Buy Now Purchase Successful!",
            description: "Your item has been purchased and will be available shortly once payment is verified.",
          })
        } else {
          toast({
            title: "✅ Payment Successful!",
            description: "Your payment has been processed. The item will be available shortly once verified.",
          })
        }
        
        // Clean up the URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('payment_success')
        newUrl.searchParams.delete('type')
        newUrl.searchParams.delete('auctionId')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [toast])

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const { data, error } = await supabaseClient
          .from('auctions')
          .select('*')
          .eq('experience_id', params.experienceId)
          .in('status', ['LIVE', 'COMING_SOON']) // Show both live and coming soon auctions
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

        // Also fetch past auctions (all completed auctions with winners)
        const { data: pastData, error: pastError } = await supabaseClient
          .from('auctions')
          .select('*')
          .eq('experience_id', params.experienceId)
          .in('status', ['ENDED', 'PAID', 'FULFILLED'])
          .not('winner_user_id', 'is', null)
          .order('ends_at', { ascending: false })
          .limit(10) // Show last 10 past auctions

        if (!pastError) {
          setPastAuctions(pastData || [])
          
          // Fetch usernames for past auction winners
          if (pastData && pastData.length > 0) {
            const uniqueUserIds = Array.from(new Set(pastData.map(auction => auction.winner_user_id).filter(Boolean)))
            await fetchUserNames(uniqueUserIds)
          }
        }
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
      
              // Open payment modal using the full payment data
        const res = await createInAppPurchase(chargeResult)
      
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

              // Add item to barracks
        const addToBarracksResponse = await fetch('/api/barracks/add-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auctionId: auctionId,
            userId: currentUserId,
            planId: chargeResult.charge.planId,
            amountCents: auction.buy_now_price_cents,
            status: 'PENDING_PAYMENT'
          })
        })

        if (!addToBarracksResponse.ok) {
          console.error('Failed to add item to barracks')
        }

        // Remove auction from marketplace
        const removeResponse = await fetch(`/api/auctions/${auctionId}/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUserId,
            experienceId: params.experienceId
          })
        })

        if (!removeResponse.ok) {
          console.error('Failed to remove auction from marketplace')
        }

        toast({
          title: "Payment Window Opened",
          description: "Please complete your payment. You'll be redirected to your barracks to claim your item.",
        })

        // Redirect to barracks after a short delay
        setTimeout(() => {
          window.location.href = `/experiences/${params.experienceId}/barracks`
        }, 2000)
    } catch (error) {
      console.error('Error buying now:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete purchase",
        variant: "destructive",
      })
    }
  }

  const fetchUserNames = async (userIds: string[]) => {
    try {
      const newUserNames: Record<string, string> = {}
      
      for (const userId of userIds) {
        if (!userNames[userId]) { // Only fetch if we don't already have it
          try {
            const response = await fetch(`/api/whop/user-info?userId=${userId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.user) {
                newUserNames[userId] = data.user.username || data.user.name || userId
              } else {
                newUserNames[userId] = userId
              }
            } else {
              newUserNames[userId] = userId
            }
          } catch (error) {
            console.error('Error fetching username for user:', userId, error)
            newUserNames[userId] = userId
          }
        }
      }
      
      if (Object.keys(newUserNames).length > 0) {
        setUserNames(prev => ({ ...prev, ...newUserNames }))
      }
    } catch (error) {
      console.error('Error fetching usernames:', error)
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

  // Debug logging for marketplace state
  console.log('Marketplace state:', {
    auctionsCount: auctions.length,
    currentBidsCount: Object.keys(currentBids).length,
    currentBids,
    loading
  })

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

        {/* Past Auctions Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
              🏆 PAST AUCTIONS
            </h3>
            <Badge variant="secondary" className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold">
              {pastAuctions.length} COMPLETED
            </Badge>
          </div>
          
          {pastAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {pastAuctions.map((auction) => (
                <div key={auction.id} className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {auction.title}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className="text-xs border-gray-400 text-gray-600"
                      >
                        {auction.type}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Winner:</span> {userNames[auction.winner_user_id || ''] || auction.winner_user_id?.substring(0, 8) + '...' || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-medium">Sold for:</span> {formatCurrency(auction.start_price_cents)}
                      </p>
                      <p>
                        <span className="font-medium">Ended:</span> {new Date(auction.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-medium mb-2 text-gray-700">No past auctions yet</h3>
              <p className="text-gray-500">
                Be the first to create an auction and make history!
              </p>
            </div>
          )}
        </div>
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
