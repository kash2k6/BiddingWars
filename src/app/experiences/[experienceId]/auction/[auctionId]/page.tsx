"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getWhopContext } from "@/lib/whop-context"
import { supabaseClient } from "@/lib/supabase-client"
import { getIframeContext, createInAppPurchase } from "@/lib/whop-client"
import { formatCurrency } from "@/lib/payouts"
import { Countdown } from "@/components/Countdown"
import { ExcitingBidButton } from "@/components/ExcitingBidButton"
import { PaymentHandler } from "@/components/PaymentHandler"
import { DigitalProductDelivery } from "@/components/DigitalProductDelivery"
import { PhysicalProductFulfillment } from "@/components/PhysicalProductFulfillment"
import AuctionChat from "@/components/AuctionChat"
import { LiveFeed } from "@/components/LiveFeed"
import { 
  Clock, 
  DollarSign, 
  Package, 
  Download, 
  Truck, 
  Users, 
  MessageCircle, 
  Bell,
  ArrowLeft,
  Eye,
  Flame,
  Zap,
  Trophy,
  Send
} from "lucide-react"
import { SoundManager } from "@/lib/sound-effects"

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
  // Digital product fields
  digital_delivery_type?: 'FILE' | 'DISCOUNT_CODE' | 'DOWNLOAD_LINK'
  digital_file_path?: string
  digital_discount_code?: string
  digital_download_link?: string
  digital_instructions?: string
}

interface Bid {
  id: string
  amount_cents: number
  bidder_user_id: string
  created_at: string
  bidder_name?: string
}



export default function AuctionDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newBidAmount, setNewBidAmount] = useState<number>(0)
  const [notifications, setNotifications] = useState<string[]>([])
  const notificationsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function getContext() {
      try {
        const ctx = await getWhopContext()
        let actualUserId = ctx.userId
        if (ctx.userId.includes('.')) {
          try {
            const payload = JSON.parse(Buffer.from(ctx.userId.split('.')[1], 'base64').toString())
            actualUserId = payload.sub
          } catch (error) {
            console.log('Failed to parse JWT, using as-is:', ctx.userId)
          }
        }
        setCurrentUserId(actualUserId)
      } catch (error) {
        console.error("Failed to get Whop context:", error)
      }
    }

    getContext()
  }, [])

  useEffect(() => {
    async function fetchAuctionData() {
      if (!params.auctionId) return

      try {
        // Play dramatic entrance sound
        await SoundManager.playPageEntrance()

        // Fetch auction details
        const { data: auctionData, error: auctionError } = await supabaseClient
          .from('auctions')
          .select('*')
          .eq('id', params.auctionId)
          .single()

        if (auctionError) throw auctionError
        setAuction(auctionData)

        // Fetch bids
        const { data: bidsData, error: bidsError } = await supabaseClient
          .from('bids')
          .select('*')
          .eq('auction_id', params.auctionId)
          .order('created_at', { ascending: false })

        if (bidsError) throw bidsError
        setBids(bidsData || [])

        // Set initial bid amount
        if (bidsData && bidsData.length > 0) {
          const topBid = Math.max(...bidsData.map(bid => bid.amount_cents))
          setNewBidAmount(topBid + auctionData.min_increment_cents)
        } else {
          setNewBidAmount(auctionData.start_price_cents)
        }

      } catch (error) {
        console.error('Error fetching auction data:', error)
        toast({
          title: "Error",
          description: "Failed to load auction details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

      fetchAuctionData()
}, [params.auctionId, toast])

  // Real-time subscriptions
  useEffect(() => {
    if (!params.auctionId) return

    // Subscribe to bid updates
    const bidsChannel = supabaseClient
      .channel(`auction-bids-${params.auctionId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'bids',
          filter: `auction_id=eq.${params.auctionId}`
        }, 
        (payload) => {
          const newBid = payload.new as Bid
          setBids(prev => [newBid, ...prev])
          setNewBidAmount(newBid.amount_cents + (auction?.min_increment_cents || 100))
          
          // Add notification
          if (newBid.bidder_user_id !== currentUserId) {
            const notification = `🔥 New bid: ${formatCurrency(newBid.amount_cents)}!`
            setNotifications(prev => [...prev, notification])
            toast({
              title: "New Bid!",
              description: `Someone bid ${formatCurrency(newBid.amount_cents)}`,
            })
          }
        }
      )
      .subscribe()

    // Subscribe to auction updates
    const auctionChannel = supabaseClient
      .channel(`auction-${params.auctionId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'auctions',
          filter: `id=eq.${params.auctionId}`
        }, 
        (payload) => {
          const updatedAuction = payload.new as Auction
          setAuction(updatedAuction)
          
          // Play victory sound if auction is won by current user
          if (updatedAuction.status === 'PAID' && updatedAuction.winner_user_id === currentUserId) {
            SoundManager.playAuctionWon()
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(bidsChannel)
      supabaseClient.removeChannel(auctionChannel)
    }
  }, [params.auctionId, currentUserId, auction?.min_increment_cents, toast])

  const handleBid = async () => {
    if (!auction || !currentUserId) return

    try {
      const response = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amountCents: newBidAmount,
          userId: currentUserId,
          experienceId: auction.experience_id,
          companyId: undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bid')
      }

      toast({
        title: "Bid Placed!",
        description: `Your bid of ${formatCurrency(newBidAmount)} has been placed successfully.`,
      })

      // Update local state
      const newBid: Bid = {
        id: result.id,
        amount_cents: newBidAmount,
        bidder_user_id: currentUserId,
        created_at: new Date().toISOString(),
      }
      setBids(prev => [newBid, ...prev])
      setNewBidAmount(newBidAmount + auction.min_increment_cents)

    } catch (error) {
      console.error('Error placing bid:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place bid",
        variant: "destructive",
      })
    }
  }

  const handleBuyNow = async () => {
    if (!auction || !currentUserId) return

    try {
      // First, process the payment through PaymentHandler
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

      // Now finalize the auction
      const finalizeResponse = await fetch(`/api/auctions/${auction.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          experienceId: auction.experience_id,
          companyId: undefined,
          buyNow: true,
          amount: auction.buy_now_price_cents
        }),
      })

      const result = await finalizeResponse.json()

      if (!finalizeResponse.ok) {
        throw new Error(result.error || 'Failed to finalize purchase')
      }

      // Update local auction state
      setAuction(prev => prev ? {
        ...prev,
        status: 'PAID',
        winner_user_id: currentUserId
      } : null)

      toast({
        title: "Purchase Complete! 🎉",
        description: "You have successfully purchased this item.",
      })
    } catch (error) {
      console.error('Error processing buy now purchase:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process purchase",
        variant: "destructive",
      })
    }
  }



  const isLive = auction?.status === 'LIVE'
  const isEnded = auction?.status === 'ENDED'
  const isPaid = auction?.status === 'PAID'
  const isWinner = auction?.winner_user_id === currentUserId
  const isCreator = auction?.created_by_user_id === currentUserId
  const currentBid = bids.length > 0 ? Math.max(...bids.map(bid => bid.amount_cents)) : auction?.start_price_cents || 0
  const canBid = isLive && currentUserId && !isCreator
  const canBuyNow = isLive && auction?.buy_now_price_cents && currentUserId && !isCreator

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Auction Not Found</h2>
        <Button onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
            {auction.title}
          </h1>

        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 font-semibold">LIVE</span>
            </div>
          )}
          <Badge variant={auction.type === 'DIGITAL' ? 'default' : 'secondary'}>
            {auction.type}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auction Image */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-slate-700 to-purple-800 flex items-center justify-center">
                {auction.images && auction.images.length > 0 ? (
                  <img 
                    src={auction.images[0]} 
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-purple-300">
                    <Package className="h-24 w-24 mb-4" />
                    <span className="text-lg">No Image Available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Auction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">{auction.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Starting Price</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(auction.start_price_cents)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Current Bid</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(currentBid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Minimum Increment</p>
                  <p className="text-lg text-white">{formatCurrency(auction.min_increment_cents)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Community Fee</p>
                  <p className="text-lg text-white">{auction.community_pct}%</p>
                </div>
              </div>

              {auction.buy_now_price_cents && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <span className="text-lg font-bold text-green-300">
                      Buy Now: {formatCurrency(auction.buy_now_price_cents)}
                    </span>
                  </div>
                </div>
              )}

              {auction.shipping_cost_cents > 0 && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Truck className="h-4 w-4" />
                  <span>Shipping: {formatCurrency(auction.shipping_cost_cents)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Digital Product Delivery for Winners */}
          {auction.status === 'PAID' && auction.type === 'DIGITAL' && (
            <Card>
              <CardContent className="p-0">
                <DigitalProductDelivery 
                  auction={auction} 
                  isWinner={isWinner} 
                  currentUserId={currentUserId || undefined}
                />
              </CardContent>
            </Card>
          )}

          {/* Physical Product Fulfillment */}
          {auction.status === 'PAID' && auction.type === 'PHYSICAL' && currentUserId && (
            <Card>
              <CardContent className="p-0">
                <PhysicalProductFulfillment 
                  auction={auction} 
                  currentUserId={currentUserId} 
                  experienceId={Array.isArray(params.experienceId) ? params.experienceId[0] : params.experienceId} 
                />
              </CardContent>
            </Card>
          )}

          {/* Live Bidding Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Live Bidding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prominent Countdown Section */}
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-400 mb-2">⏰ Time Remaining</p>
                    <div className="flex justify-center sm:justify-start">
                      <Countdown endTime={auction.ends_at} className="text-lg" />
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-gray-400 mb-2">🏆 Total Bids</p>
                    <p className="text-2xl font-bold text-white">{bids.length}</p>
                  </div>
                </div>
              </div>

              {canBid && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newBidAmount / 100}
                      onChange={(e) => setNewBidAmount(Math.round(parseFloat(e.target.value) * 100))}
                      className="flex-1"
                      min={currentBid / 100 + auction.min_increment_cents / 100}
                      step={auction.min_increment_cents / 100}
                    />
                    <ExcitingBidButton
                      amount={newBidAmount}
                      previousAmount={currentBid}
                      onClick={handleBid}
                      isWinning={false}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Minimum bid: {formatCurrency(currentBid + auction.min_increment_cents)}
                  </p>
                </div>
              )}

              {canBuyNow && (
                <div className="space-y-2">
                  <PaymentHandler
                    auctionId={auction.id}
                    amount={auction.buy_now_price_cents!}
                    onSuccess={handleBuyNow}
                    disabled={false}
                  />
                  <p className="text-xs text-gray-400 text-center">
                    Buy now and end the auction immediately
                  </p>
                </div>
              )}

              {isCreator && (
                <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <p className="text-blue-300">🎯 This is your auction - you cannot bid on your own items</p>
                </div>
              )}

              {isEnded && (
                <div className="text-center p-4 bg-gray-500/20 rounded-lg border border-gray-500/30">
                  <p className="text-gray-300">⏰ This auction has ended</p>
                  {isWinner && (
                    <p className="text-green-300 mt-2">🏆 Congratulations! You won this auction!</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Feed */}
          <LiveFeed 
            experienceId={Array.isArray(params.experienceId) ? params.experienceId[0] : params.experienceId}
            currentUserId={currentUserId || undefined}
            maxItems={15}
          />

          {/* Recent Bids */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Recent Bids
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {bids.length === 0 ? (
                <p className="text-gray-400 text-sm">No bids yet...</p>
              ) : (
                bids.slice(0, 10).map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {bid.bidder_user_id === currentUserId ? 'You' : `User ${bid.bidder_user_id.slice(-4)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(bid.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-400">
                      {formatCurrency(bid.amount_cents)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Auction Chat - Only for winner and seller */}
          {auction && currentUserId && (
            <AuctionChat
              auctionId={auction.id}
              experienceId={auction.experience_id}
              currentUserId={currentUserId}
              currentUserName={`User ${currentUserId.slice(-4)}`}
              isWinner={auction.winner_user_id === currentUserId}
              isSeller={auction.created_by_user_id === currentUserId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
