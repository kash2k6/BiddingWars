"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getWhopContext } from "@/lib/whop-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/payouts"
import { Package, Clock, CheckCircle, Truck, DollarSign, Trophy } from "lucide-react"

interface Auction {
  id: string
  title: string
  description: string
  type: 'DIGITAL' | 'PHYSICAL'
  status: string
  start_price_cents: number
  buy_now_price_cents?: number
  starts_at: string
  ends_at: string
  winner_user_id?: string
  current_bid_id?: string
  created_at: string
  created_by_user_id: string
  bids: {
    amount_cents: number
  }[]
}

export default function MyAuctionsPage({ params }: { params: { experienceId: string } }) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [pastAuctions, setPastAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [shippingForm, setShippingForm] = useState<{
    auctionId: string | null
    trackingNumber: string
    shippingCarrier: string
  }>({
    auctionId: null,
    trackingNumber: '',
    shippingCarrier: ''
  })
  const [showShippingForm, setShowShippingForm] = useState(false)

  useEffect(() => {
    async function getContext() {
      try {
        const ctx = await getWhopContext()
        
        // Extract actual user ID from JWT if needed
        let actualUserId = ctx.userId
        if (ctx.userId.includes('.')) {
          try {
            const payload = JSON.parse(Buffer.from(ctx.userId.split('.')[1], 'base64').toString())
            actualUserId = payload.sub
            console.log('Extracted user ID from JWT for My Auctions:', actualUserId)
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
    async function fetchAuctions() {
      if (!currentUserId) return

      try {
        const { data, error } = await supabaseClient
          .from('auctions')
          .select(`
            id,
            title,
            description,
            type,
            status,
            start_price_cents,
            buy_now_price_cents,
            starts_at,
            ends_at,
            winner_user_id,
            current_bid_id,
            created_at,
            created_by_user_id,
            bids(
              amount_cents
            )
          `)
          .or(`created_by_user_id.eq.${currentUserId},winner_user_id.eq.${currentUserId}`)
          .eq('experience_id', params.experienceId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAuctions(data || [])
        
        // Also fetch past auctions (all completed auctions with winners)
        const { data: pastData, error: pastError } = await supabaseClient
          .from('auctions')
          .select(`
            id,
            title,
            description,
            type,
            status,
            start_price_cents,
            buy_now_price_cents,
            starts_at,
            ends_at,
            winner_user_id,
            current_bid_id,
            created_at,
            created_by_user_id,
            bids(
              amount_cents
            )
          `)
          .eq('experience_id', params.experienceId)
          .in('status', ['ENDED', 'PAID', 'FULFILLED'])
          .not('winner_user_id', 'is', null)
          .order('ends_at', { ascending: false })
          .limit(10) // Show last 10 past auctions

        if (!pastError) {
          setPastAuctions(pastData || [])
        }
      } catch (error) {
        console.error('Error fetching auctions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuctions()
  }, [currentUserId, params.experienceId])

  const categorizeAuctions = () => {
    const scheduled: Auction[] = []
    const live: Auction[] = []
    const ended: Auction[] = []
    const pendingPayment: Auction[] = []
    const paid: Auction[] = []
    const fulfilled: Auction[] = []

    auctions.forEach(auction => {
      switch (auction.status) {
        case 'COMING_SOON':
          scheduled.push(auction)
          break
        case 'LIVE':
          live.push(auction)
          break
        case 'ENDED':
          ended.push(auction)
          break
        case 'PENDING_PAYMENT':
          pendingPayment.push(auction)
          break
        case 'PAID':
          paid.push(auction)
          break
        case 'FULFILLED':
          fulfilled.push(auction)
          break
      }
    })

    return { scheduled, live, ended, pendingPayment, paid, fulfilled }
  }

  const { scheduled, live, ended, pendingPayment, paid, fulfilled } = categorizeAuctions()

  const getCurrentBid = (auction: Auction) => {
    if (auction.bids.length === 0) return auction.start_price_cents
    return Math.max(...auction.bids.map(bid => bid.amount_cents))
  }

  const getUserRole = (auction: Auction) => {
    if (auction.created_by_user_id === currentUserId) {
      return 'CREATOR'
    } else if (auction.winner_user_id === currentUserId) {
      return 'WINNER'
    }
    return 'UNKNOWN'
  }

  const handleEndEarly = async (auctionId: string) => {
    // This would call an API to end the auction early
    console.log('End auction early:', auctionId)
  }

  const handleEditAuction = async (auctionId: string) => {
    // Navigate to edit page with auction data
    router.push(`/experiences/${params.experienceId}/create?edit=${auctionId}`)
  }

  const handleMarkShipped = (auctionId: string) => {
    setShippingForm({
      auctionId,
      trackingNumber: '',
      shippingCarrier: ''
    })
    setShowShippingForm(true)
  }

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Shipping form submitted:', shippingForm)
    
    if (!shippingForm.auctionId || !shippingForm.trackingNumber || !shippingForm.shippingCarrier) {
      alert('Please fill in all shipping details')
      return
    }

    try {
      console.log('📞 Fetching user context...')
      const contextResponse = await fetch('/api/whop-context')
      console.log('📞 Context response status:', contextResponse.status)
      
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()
      console.log('📞 User context:', context)

      const requestBody = {
        auctionId: shippingForm.auctionId,
        userId: context.userId,
        experienceId: context.experienceId,
        action: 'mark_shipped',
        trackingNumber: shippingForm.trackingNumber,
        shippingCarrier: shippingForm.shippingCarrier
      }
      
      console.log('📞 Sending API request:', requestBody)
      
      const response = await fetch('/api/fulfillment/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('📞 API response status:', response.status)
      const result = await response.json()
      console.log('📞 API response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as shipped')
      }

      console.log('✅ Success! Resetting form and reloading...')
      
      // Reset form and hide it
      setShowShippingForm(false)
      setShippingForm({
        auctionId: null,
        trackingNumber: '',
        shippingCarrier: ''
      })

      // Refresh the page to update the UI
      window.location.reload()
    } catch (error) {
      console.error('❌ Error marking as shipped:', error)
      alert('Failed to mark as shipped: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
    <div className="space-y-6">
      {/* Shipping Form Modal */}
      {showShippingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">📦 Add Shipping Details</h3>
            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tracking number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Carrier *
                </label>
                <select
                  value={shippingForm.shippingCarrier}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingCarrier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select carrier</option>
                  <option value="USPS">USPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="DHL">DHL</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowShippingForm(false)
                    setShippingForm({
                      auctionId: null,
                      trackingNumber: '',
                      shippingCarrier: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Mark as Shipped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-teal-600 bg-clip-text text-transparent">
            🛡️ MY WAR ZONE 🛡️
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600 font-semibold">ACTIVE</span>
          </div>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold">
          {auctions.length} TOTAL MISSIONS
        </Badge>
      </div>

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduled ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Live ({live.length})
          </TabsTrigger>
          <TabsTrigger value="ended" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Ended ({ended.length})
          </TabsTrigger>
          <TabsTrigger value="pending-payment" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pending ({pendingPayment.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Paid ({paid.length})
          </TabsTrigger>
          <TabsTrigger value="fulfilled" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Fulfilled ({fulfilled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No scheduled auctions</h3>
                <p className="text-muted-foreground">
                  You don't have any scheduled auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            scheduled.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Starting bid: {formatCurrency(auction.start_price_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Starts: {new Date(auction.starts_at).toLocaleDateString()} at {new Date(auction.starts_at).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ends: {new Date(auction.ends_at).toLocaleDateString()} at {new Date(auction.ends_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
                        <Clock className="h-3 w-3 mr-1" />
                        SCHEDULED
                      </Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                      {getUserRole(auction) === 'CREATOR' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAuction(auction.id)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold"
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          {live.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No live auctions</h3>
                <p className="text-muted-foreground">
                  You don't have any active auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            live.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current bid: {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ends: {new Date(auction.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                        <Clock className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                      {getUserRole(auction) === 'CREATOR' && auction.bids.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAuction(auction.id)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold"
                        >
                          Edit
                        </Button>
                      )}
                      {getUserRole(auction) === 'CREATOR' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEndEarly(auction.id)}
                          className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold"
                        >
                          End Early
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-4">
          {ended.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No ended auctions</h3>
                <p className="text-muted-foreground">
                  You don't have any ended auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            ended.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Final bid: {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ended: {new Date(auction.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Ended</Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending-payment" className="space-y-4">
          {pendingPayment.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending payments</h3>
                <p className="text-muted-foreground">
                  You don't have any auctions waiting for payment.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingPayment.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Winning bid: {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Waiting for buyer payment
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending Payment</Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paid.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No paid auctions</h3>
                <p className="text-muted-foreground">
                  You don't have any paid auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            paid.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Sold for: {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Payment received
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">Paid</Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                      {getUserRole(auction) === 'CREATOR' && auction.type === 'PHYSICAL' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkShipped(auction.id)}
                        >
                          Mark Shipped
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fulfilled" className="space-y-4">
          {fulfilled.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No fulfilled auctions</h3>
                <p className="text-muted-foreground">
                  You don't have any fulfilled auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            fulfilled.map((auction) => (
              <Card key={auction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Sold for: {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Order completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-600">Fulfilled</Badge>
                      <Badge variant="outline" className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold">
                        {getUserRole(auction)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastAuctions.map((auction) => (
              <Card key={auction.id} className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                <CardContent className="p-4">
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
                        <span className="font-medium">Winner:</span> {auction.winner_user_id?.substring(0, 8)}...
                      </p>
                      <p>
                        <span className="font-medium">Sold for:</span> {formatCurrency(getCurrentBid(auction))}
                      </p>
                      <p>
                        <span className="font-medium">Ended:</span> {new Date(auction.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-gray-700">No past auctions yet</h3>
              <p className="text-gray-500">
                Be the first to create an auction and make history!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
