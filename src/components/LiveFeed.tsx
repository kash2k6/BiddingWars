"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/payouts"
import { 
  Zap, 
  Flame, 
  Trophy, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  Target,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface LiveFeedItem {
  id: string
  type: 'new_bid' | 'new_auction' | 'auction_ended' | 'auction_won' | 'buy_now' | 'outbid' | 'system'
  title: string
  message: string
  timestamp: string
  auctionId?: string
  auctionTitle?: string
  amount?: number
  userId?: string
  userName?: string
  icon: React.ReactNode
  color: string
}

interface LiveFeedProps {
  experienceId: string
  currentUserId?: string
  maxItems?: number
}

export function LiveFeed({ experienceId, currentUserId, maxItems = 20 }: LiveFeedProps) {
  const [feedItems, setFeedItems] = useState<LiveFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchInitialFeed()
    setupRealTimeSubscriptions()
  }, [experienceId])

  useEffect(() => {
    scrollToBottom()
  }, [feedItems])

  const scrollToBottom = () => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const fetchInitialFeed = async () => {
    try {
      // Fetch recent bids
      const { data: recentBids } = await supabaseClient
        .from('bids')
        .select(`
          id,
          amount_cents,
          created_at,
          bidder_user_id,
          auction_id,
          auctions!inner(
            title,
            experience_id
          )
        `)
        .eq('auctions.experience_id', experienceId)
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch recent auctions
      const { data: recentAuctions } = await supabaseClient
        .from('auctions')
        .select(`
          id,
          title,
          created_at,
          created_by_user_id,
          start_price_cents,
          type
        `)
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false })
        .limit(5)

      const items: LiveFeedItem[] = []

                // Add recent bids
          recentBids?.forEach(bid => {
            items.push({
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
              color: 'text-orange-400'
            })
          })

          // Add recent auctions
          recentAuctions?.forEach(auction => {
            items.push({
              id: `auction-${auction.id}`,
              type: 'new_auction',
              title: '🚀 New Auction Launched',
              message: `"${auction.title}" starting at ${formatCurrency(auction.start_price_cents)}`,
              timestamp: auction.created_at,
              auctionId: auction.id,
              auctionTitle: auction.title,
              amount: auction.start_price_cents,
              userId: auction.created_by_user_id,
              icon: <Package className="h-4 w-4" />,
              color: 'text-blue-400'
            })
          })

      // Sort by timestamp and limit
      const sortedItems = items
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxItems)

      setFeedItems(sortedItems)
    } catch (error) {
      console.error('Error fetching initial feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    // Subscribe to new bids
    const bidsChannel = supabaseClient
      .channel(`live-feed-bids-${experienceId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'bids',
          filter: `auction_id=in.(select id from auctions where experience_id='${experienceId}')`
        }, 
        (payload) => {
          const newBid = payload.new as any
                     addFeedItem({
             id: `bid-${newBid.id}`,
             type: 'new_bid',
             title: '🔥 New Bid Placed',
             message: `${formatCurrency(newBid.amount_cents)} on auction`,
             timestamp: newBid.created_at,
             auctionId: newBid.auction_id,
             amount: newBid.amount_cents,
             userId: newBid.bidder_user_id,
             icon: <Flame className="h-4 w-4" />,
             color: 'text-orange-400'
           })
        }
      )
      .subscribe()

    // Subscribe to new auctions
    const auctionsChannel = supabaseClient
      .channel(`live-feed-auctions-${experienceId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'auctions',
          filter: `experience_id=eq.${experienceId}`
        }, 
        (payload) => {
          const newAuction = payload.new as any
                     addFeedItem({
             id: `auction-${newAuction.id}`,
             type: 'new_auction',
             title: '🚀 New Auction Launched',
             message: `"${newAuction.title}" starting at ${formatCurrency(newAuction.start_price_cents)}`,
             timestamp: newAuction.created_at,
             auctionId: newAuction.id,
             auctionTitle: newAuction.title,
             amount: newAuction.start_price_cents,
             userId: newAuction.created_by_user_id,
             icon: <Package className="h-4 w-4" />,
             color: 'text-blue-400'
           })
        }
      )
      .subscribe()

    // Subscribe to auction status changes
    const statusChannel = supabaseClient
      .channel(`live-feed-status-${experienceId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'auctions',
          filter: `experience_id=eq.${experienceId}`
        }, 
        (payload) => {
          const updatedAuction = payload.new as any
          const oldAuction = payload.old as any

          if (oldAuction.status === 'LIVE' && updatedAuction.status === 'ENDED') {
            addFeedItem({
              id: `ended-${updatedAuction.id}`,
              type: 'auction_ended',
              title: '⏰ Auction Ended',
              message: `"${updatedAuction.title}" has ended`,
              timestamp: new Date().toISOString(),
              auctionId: updatedAuction.id,
              auctionTitle: updatedAuction.title,
                           icon: <Clock className="h-4 w-4" />,
             color: 'text-gray-400'
            })
          }

          if (oldAuction.status === 'ENDED' && updatedAuction.status === 'PAID') {
            addFeedItem({
              id: `won-${updatedAuction.id}`,
              type: 'auction_won',
              title: '🏆 Auction Won',
              message: `"${updatedAuction.title}" was purchased`,
              timestamp: new Date().toISOString(),
              auctionId: updatedAuction.id,
              auctionTitle: updatedAuction.title,
                           icon: <Trophy className="h-4 w-4" />,
             color: 'text-yellow-400'
            })
          }
        }
      )
      .subscribe()

    setIsConnected(true)

    return () => {
      supabaseClient.removeChannel(bidsChannel)
      supabaseClient.removeChannel(auctionsChannel)
      supabaseClient.removeChannel(statusChannel)
      setIsConnected(false)
    }
  }

  const addFeedItem = (item: LiveFeedItem) => {
    setFeedItems(prev => {
      const newItems = [item, ...prev].slice(0, maxItems)
      return newItems
    })
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getFeedItemStyle = (type: LiveFeedItem['type']) => {
    switch (type) {
      case 'new_bid':
        return 'bg-gradient-to-r from-orange-500/30 to-red-500/20 border-orange-400/50 hover:from-orange-500/40 hover:to-red-500/30'
      case 'new_auction':
        return 'bg-gradient-to-r from-blue-500/30 to-purple-500/20 border-blue-400/50 hover:from-blue-500/40 hover:to-purple-500/30'
      case 'auction_ended':
        return 'bg-gradient-to-r from-gray-500/30 to-gray-600/20 border-gray-400/50 hover:from-gray-500/40 hover:to-gray-600/30'
      case 'auction_won':
        return 'bg-gradient-to-r from-yellow-500/30 to-orange-500/20 border-yellow-400/50 hover:from-yellow-500/40 hover:to-orange-500/30'
      case 'buy_now':
        return 'bg-gradient-to-r from-green-500/30 to-emerald-500/20 border-green-400/50 hover:from-green-500/40 hover:to-emerald-500/30'
      case 'outbid':
        return 'bg-gradient-to-r from-red-500/30 to-pink-500/20 border-red-400/50 hover:from-red-500/40 hover:to-pink-500/30'
      default:
        return 'bg-gradient-to-r from-purple-500/30 to-indigo-500/20 border-purple-400/50 hover:from-purple-500/40 hover:to-indigo-500/30'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Live Feed
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Live Feed
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <Badge variant="secondary" className="ml-auto text-xs">
            {feedItems.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                 {feedItems.length === 0 ? (
           <div className="text-center py-4">
             <Target className="h-8 w-8 mx-auto text-gray-600 mb-2" />
             <p className="text-gray-700 text-sm">No activity yet...</p>
             <p className="text-gray-600 text-xs">Bids and auctions will appear here</p>
           </div>
        ) : (
          feedItems.map((item) => (
                         <div
               key={item.id}
               className={`
                 p-3 rounded-lg border transition-all duration-200
                 ${getFeedItemStyle(item.type)}
               `}
             >
               <div className="flex items-start gap-3">
                 <div className={`${item.color} mt-0.5`}>
                   {item.icon}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <h4 className="text-sm font-medium text-gray-900 truncate">
                       {item.title}
                     </h4>
                     <span className="text-xs text-gray-600">
                       {getTimeAgo(item.timestamp)}
                     </span>
                   </div>
                   <p className="text-xs text-gray-800 leading-relaxed">
                     {item.message}
                   </p>
                   {item.amount && (
                     <div className="flex items-center gap-1 mt-1">
                       <DollarSign className="h-3 w-3 text-green-600" />
                       <span className="text-xs text-green-600 font-medium">
                         {formatCurrency(item.amount)}
                       </span>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          ))
        )}
        <div ref={feedEndRef} />
      </CardContent>
    </Card>
  )
}
