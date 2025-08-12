"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Countdown } from "./Countdown"
import { ExcitingBidButton } from "./ExcitingBidButton"
import { PaymentHandler } from "./PaymentHandler"
import { formatCurrency } from "@/lib/payouts"
import { Clock, DollarSign, Package, Download, Flame, Truck, Eye } from "lucide-react"

interface AuctionCardProps {
  auction: {
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
  currentBid?: number
  currentBids?: Record<string, number>
  onBid?: (auctionId: string, amount: number) => void
  onBuyNow?: (auctionId: string) => void
  onDownload?: (auctionId: string) => void
  onMarkReceived?: (auctionId: string) => void
  currentUserId?: string
}

export function AuctionCard({
  auction,
  currentBid,
  currentBids,
  onBid,
  onBuyNow,
  onDownload,
  onMarkReceived,
  currentUserId
}: AuctionCardProps) {
  const isLive = auction.status === 'LIVE'
  const isEnded = auction.status === 'ENDED'
  const isPaid = auction.status === 'PAID'
  const isFulfilled = auction.status === 'FULFILLED'
  const isWinner = auction.winner_user_id === currentUserId
  const isCreator = auction.created_by_user_id === currentUserId
  const isWinningBid = Boolean(currentBid && currentUserId && currentBids && Object.keys(currentBids).length > 0 && currentBid === Math.max(...Object.values(currentBids)))

  const nextBidAmount = currentBid 
    ? currentBid + auction.min_increment_cents 
    : auction.start_price_cents

  const canBid = isLive && currentUserId && !isCreator
  const canBuyNow = isLive && auction.buy_now_price_cents && currentUserId && !isCreator
  
  // Debug logging
  console.log('AuctionCard debug:', {
    auctionId: auction.id,
    isLive,
    currentUserId,
    isCreator,
    createdByUserId: auction.created_by_user_id,
    canBid,
    canBuyNow,
    buyNowPrice: auction.buy_now_price_cents,
    status: auction.status
  })
  const canDownload = isPaid && isWinner && auction.type === 'DIGITAL'
  const canMarkReceived = isPaid && isWinner && auction.type === 'PHYSICAL'

  return (
    <Card className="w-full max-w-sm bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 group">
      <CardHeader className="relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="aspect-square bg-gradient-to-br from-slate-700 to-purple-800 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
          {auction.images && auction.images.length > 0 ? (
            <img 
              src={auction.images[0]} 
              alt={auction.title}
              className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-purple-300">
              <Package className="h-12 w-12 mb-2" />
              <span className="text-xs">No Image</span>
            </div>
          )}
          
          {/* Status indicator */}
          {isLive && (
            <div className="absolute top-2 right-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
        
        <CardTitle className="text-lg text-white group-hover:text-purple-300 transition-colors duration-300">
          {auction.title}
        </CardTitle>
        
        <div className="flex gap-2">
          <Badge variant={auction.type === 'DIGITAL' ? 'default' : 'secondary'} 
                 className={`${auction.type === 'DIGITAL' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-green-500 to-teal-600'} text-white font-bold`}>
            {auction.type}
          </Badge>
          <Badge variant="outline" className="border-purple-500/50 text-purple-300">
            {auction.community_pct}% Community
          </Badge>
        </div>
      </CardHeader>
      
                        <CardContent className="space-y-4 relative">
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {auction.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400">Current Bid</p>
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(currentBid || auction.start_price_cents)}
                        </p>
                      </div>
                    <div className="text-center mt-2">
                      <p className="text-xs font-medium text-orange-300 mb-1">⏰ ENDS IN</p>
                      <Countdown endTime={auction.ends_at} />
                    </div>
                    </div>

                    {auction.buy_now_price_cents && (
                      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-green-300">
                          Buy Now: {formatCurrency(auction.buy_now_price_cents)}
                        </span>
                      </div>
                    )}

                    {auction.shipping_cost_cents > 0 && (
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        +{formatCurrency(auction.shipping_cost_cents)} shipping
                      </div>
                    )}
                  </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {/* Creator notice */}
        {isCreator && (
          <div className="text-xs text-blue-400 w-full text-center mb-2">
            🎯 This is your auction - you cannot bid on your own items
          </div>
        )}
        
        {/* Bid Button - Always in its own row for clarity */}
        <div className="w-full">
          {canBid ? (
            <ExcitingBidButton
              amount={nextBidAmount}
              previousAmount={currentBid || auction.start_price_cents}
              onClick={() => onBid?.(auction.id, nextBidAmount)}
              isWinning={isWinningBid}
            />
          ) : (
            <Button 
              disabled
              className="w-full bg-gray-500 text-white text-sm py-3"
            >
              {isCreator ? 'Cannot Bid on Your Own Auction' : 'Cannot Bid'}
            </Button>
          )}
        </div>

        {/* Buy Now Button - Separate row */}
        {auction.buy_now_price_cents && (
          <div className="w-full">
            {canBuyNow ? (
              <PaymentHandler
                auctionId={auction.id}
                amount={auction.buy_now_price_cents}
                onSuccess={() => onBuyNow?.(auction.id)}
                disabled={false}
              />
            ) : (
              <Button 
                disabled
                className="w-full bg-gray-500 text-white text-sm py-3"
              >
                Cannot Buy Now
              </Button>
            )}
          </div>
        )}

        {/* Secondary actions */}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {canDownload && (
            <Button 
              onClick={() => onDownload?.(auction.id)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          {canMarkReceived && (
            <Button 
              onClick={() => onMarkReceived?.(auction.id)}
              className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold text-sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Mark Received
            </Button>
          )}

          {isEnded && !isWinner && (
            <Badge variant="secondary" className="w-full justify-center bg-gray-500 text-white">
              <Clock className="h-4 w-4 mr-2" />
              Auction Ended
            </Badge>
          )}
        </div>

        {/* View Details Link */}
        <Button 
          variant="outline" 
          className="w-full mt-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          onClick={() => window.location.href = `/experiences/${auction.experience_id}/auction/${auction.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
