"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/payouts"
import { Gavel, Clock, CheckCircle, XCircle, Flame, Zap, Trophy } from "lucide-react"

interface Bid {
  id: string
  auction_id: string
  amount_cents: number
  created_at: string
  auction: {
    id: string
    title: string
    status: string
    ends_at: string
    winner_user_id?: string
    current_bid_id?: string
  }
}

export default function MyBidsPage({ params }: { params: { experienceId: string } }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

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
            console.log('Extracted user ID from JWT for My Bids:', actualUserId)
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
    async function fetchBids() {
      if (!currentUserId) return

      try {
        const { data, error } = await supabaseClient
          .from('bids')
          .select(`
            id,
            auction_id,
            amount_cents,
            created_at,
            auction:auctions(
              id,
              title,
              status,
              ends_at,
              winner_user_id,
              current_bid_id
            )
          `)
          .eq('bidder_user_id', currentUserId)
          .eq('auction.experience_id', params.experienceId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setBids(data || [])
      } catch (error) {
        console.error('Error fetching bids:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBids()
  }, [currentUserId, params.experienceId])

  const categorizeBids = () => {
    const inBid: Bid[] = []
    const won: Bid[] = []
    const lost: Bid[] = []

    bids.forEach(bid => {
      const auction = bid.auction
      const isWinner = auction.winner_user_id === currentUserId
      const isHighestBid = auction.current_bid_id === bid.id
      const isEnded = auction.status === 'ENDED' || auction.status === 'PAID' || auction.status === 'FULFILLED'

      if (isEnded) {
        if (isWinner) {
          won.push(bid)
        } else {
          lost.push(bid)
        }
      } else if (isHighestBid) {
        inBid.push(bid)
      } else {
        lost.push(bid)
      }
    })

    return { inBid, won, lost }
  }

  const { inBid, won, lost } = categorizeBids()

  const handleIncreaseBid = async (auctionId: string, currentAmount: number) => {
    try {
      // Get the current Whop context
      const contextResponse = await fetch('/api/whop-context')
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()

      // Calculate next bid amount (current + minimum increment)
      const nextBidAmount = currentAmount + 100 // Default minimum increment

      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amountCents: nextBidAmount,
          userId: context.userId,
          experienceId: context.experienceId,
          companyId: context.companyId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to increase bid')
      }

      // Refresh the page to show updated bids
      window.location.reload()
    } catch (error) {
      console.error('Error increasing bid:', error)
      alert('Failed to increase bid: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            ⚡ MY BIDS ⚡
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-600 font-semibold">ACTIVE</span>
          </div>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
          {bids.length} TOTAL BIDS
        </Badge>
      </div>

      <Tabs defaultValue="in-bid" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in-bid" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            In Bid ({inBid.length})
          </TabsTrigger>
          <TabsTrigger value="won" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Won ({won.length})
          </TabsTrigger>
          <TabsTrigger value="lost" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Lost ({lost.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-bid" className="space-y-4">
          {inBid.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No active bids</h3>
                <p className="text-muted-foreground">
                  You're not currently the highest bidder on any auctions.
                </p>
              </CardContent>
            </Card>
          ) : (
            inBid.map((bid) => (
              <Card key={bid.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{bid.auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Your bid: {formatCurrency(bid.amount_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Placed on {new Date(bid.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold">
                        <Trophy className="h-3 w-3 mr-1" />
                        LEADING
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleIncreaseBid(bid.auction_id, bid.amount_cents)}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Increase Bid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="won" className="space-y-4">
          {won.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No won auctions</h3>
                <p className="text-muted-foreground">
                  You haven't won any auctions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            won.map((bid) => (
              <Card key={bid.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{bid.auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Winning bid: {formatCurrency(bid.amount_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Won on {new Date(bid.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                        <Trophy className="h-3 w-3 mr-1" />
                        WON! 🎉
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="lost" className="space-y-4">
          {lost.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No lost auctions</h3>
                <p className="text-muted-foreground">
                  You haven't lost any auctions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            lost.map((bid) => (
              <Card key={bid.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{bid.auction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Your bid: {formatCurrency(bid.amount_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Placed on {new Date(bid.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold">
                        <XCircle className="h-3 w-3 mr-1" />
                        OUTBID
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
