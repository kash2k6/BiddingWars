"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/payouts"
import { SoundManager } from "@/lib/sound-effects"
import { 
  Flame, 
  Zap, 
  Target, 
  Crown, 
  DollarSign, 
  Clock,
  AlertTriangle
} from "lucide-react"

interface LiveFeedItem {
  id: string
  type: 'new_bid' | 'new_auction' | 'auction_ended' | 'auction_won' | 'buy_now' | 'outbid'
  title: string
  message: string
  timestamp: string
  auctionId?: string
  auctionTitle?: string
  amount?: number
  userId?: string
  icon: React.ReactNode
}

interface LiveFeedProps {
  experienceId: string
  currentUserId?: string
  maxItems?: number
}

export function LiveFeed({ experienceId, currentUserId, maxItems = 10 }: LiveFeedProps) {
  const [feedItems, setFeedItems] = useState<LiveFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load recent bids
        const { data: recentBids } = await supabaseClient
          .from('bids')
          .select(`
            id,
            amount_cents,
            created_at,
            auction_id,
            bidder_user_id,
            auctions (
              title,
              experience_id
            )
          `)
          .eq('auctions.experience_id', experienceId)
          .order('created_at', { ascending: false })
          .limit(maxItems)

        if (recentBids) {
          const items: LiveFeedItem[] = recentBids.map((bid) => ({
            id: `bid-${bid.id}`,
            type: 'new_bid',
            title: '🔥 New Bid Placed',
            message: `${formatCurrency(bid.amount_cents)} on auction`,
            timestamp: bid.created_at,
            auctionId: bid.auction_id,
            auctionTitle: bid.auctions?.[0]?.title || 'Auction',
            amount: bid.amount_cents,
            userId: bid.bidder_user_id,
            icon: <Flame className="h-4 w-4" />,
          }))

          setFeedItems(items)
        }
      } catch (error) {
        console.error('Error loading live feed:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [experienceId, maxItems])

  useEffect(() => {
    const channel = supabaseClient
      .channel('live-feed-updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'bids'
        }, 
        async (payload) => {
          const newBid = payload.new as any
          
          // Check if this bid is for an auction in our experience
          const { data: auction } = await supabaseClient
            .from('auctions')
            .select('title, experience_id')
            .eq('id', newBid.auction_id)
            .single()

          if (auction && auction.experience_id === experienceId) {
            const newItem: LiveFeedItem = {
              id: `bid-${newBid.id}`,
              type: 'new_bid',
              title: '🔥 New Bid Placed',
              message: `${formatCurrency(newBid.amount_cents)} on "${auction.title}"`,
              timestamp: newBid.created_at,
              auctionId: newBid.auction_id,
              auctionTitle: auction.title,
              amount: newBid.amount_cents,
              userId: newBid.bidder_user_id,
              icon: <Flame className="h-4 w-4" />,
            }

            // Check if current user was outbid
            if (currentUserId && newBid.bidder_user_id !== currentUserId) {
              // Get previous highest bidder
              const { data: previousBid } = await supabaseClient
                .from('bids')
                .select('bidder_user_id')
                .eq('auction_id', newBid.auction_id)
                .order('amount_cents', { ascending: false })
                .limit(2)
                .single()

              if (previousBid && previousBid.bidder_user_id === currentUserId) {
                // Current user was outbid - play alert sound
                SoundManager.playOutbid()
                
                const outbidItem: LiveFeedItem = {
                  id: `outbid-${newBid.id}`,
                  type: 'outbid',
                  title: '🚨 You\'ve Been Outbid!',
                  message: `Someone bid ${formatCurrency(newBid.amount_cents)} on "${auction.title}"`,
                  timestamp: newBid.created_at,
                  auctionId: newBid.auction_id,
                  auctionTitle: auction.title,
                  amount: newBid.amount_cents,
                  userId: newBid.bidder_user_id,
                  icon: <AlertTriangle className="h-4 w-4" />,
                }
                
                setFeedItems(prev => [outbidItem, ...prev.slice(0, maxItems - 1)])
                return
              }
            }

            setFeedItems(prev => [newItem, ...prev.slice(0, maxItems - 1)])
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [experienceId, currentUserId, maxItems])

  const getFeedItemStyle = (type: string) => {
    switch (type) {
      case 'new_bid':
        return 'bg-gradient-to-r from-orange-500/30 to-red-500/20 border-orange-400/50'
      case 'outbid':
        return 'bg-gradient-to-r from-red-500/40 to-pink-500/30 border-red-400/60'
      case 'new_auction':
        return 'bg-gradient-to-r from-blue-500/30 to-purple-500/20 border-blue-400/50'
      case 'auction_ended':
        return 'bg-gradient-to-r from-gray-500/30 to-slate-500/20 border-gray-400/50'
      case 'auction_won':
        return 'bg-gradient-to-r from-green-500/30 to-emerald-500/20 border-green-400/50'
      case 'buy_now':
        return 'bg-gradient-to-r from-yellow-500/30 to-amber-500/20 border-yellow-400/50'
      default:
        return 'bg-gradient-to-r from-gray-500/30 to-slate-500/20 border-gray-400/50'
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'new_bid':
        return 'text-orange-400'
      case 'outbid':
        return 'text-red-400'
      case 'new_auction':
        return 'text-blue-400'
      case 'auction_ended':
        return 'text-gray-400'
      case 'auction_won':
        return 'text-green-400'
      case 'buy_now':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Flame className="h-5 w-5 text-orange-400" />
            Live Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading activity...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Flame className="h-5 w-5 text-orange-400" />
          Live Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {feedItems.length === 0 ? (
            <div className="p-4 text-center">
              <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No activity yet...</p>
              <p className="text-gray-500 text-xs">Bids and events will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {feedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${getFeedItemStyle(item.type)} transition-all duration-200 hover:scale-105`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/10 ${getIconColor(item.type)}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {item.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs bg-white/20 text-gray-800 border-gray-300/30">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>
                      <p className="text-gray-800 text-sm mb-1">
                        {item.message}
                      </p>
                      {item.amount && (
                        <p className="text-green-600 font-semibold text-sm">
                          {formatCurrency(item.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
