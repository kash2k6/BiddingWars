'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getIframeContext } from '@/lib/whop-iframe'
import { supabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, AlertTriangle, CheckCircle, DollarSign, Package, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createInAppPurchase } from '@/lib/whop-iframe'

interface WonAuction {
  id: string
  title: string
  description: string
  type: 'PHYSICAL' | 'DIGITAL'
  status: string
  winner_user_id: string
  current_bid_id: string
  payment_id: string
  plan_id: string
  checkout_session_id: string
  current_bid_amount_cents: number
  shipping_cost_cents: number
  digital_product?: {
    delivery_type: 'FILE' | 'DOWNLOAD_LINK' | 'DISCOUNT_CODE'
    file_url?: string
    download_link?: string
    discount_code?: string
  }
  seller_info?: {
    username: string
    email: string
  }
}

export default function ClaimWinPage() {
  const { toast } = useToast()
  const params = useParams()
  const [auction, setAuction] = useState<WonAuction | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    const loadAuction = async () => {
      try {
        const iframeContext = await getIframeContext()
        setContext(iframeContext)
        
        // Get the auction details
        const supabase = createClient()
        const { data: auctionData, error } = await supabase
          .from('auctions')
          .select(`
            *,
            seller:created_by_user_id(username, email),
            current_bid:current_bid_id(amount_cents)
          `)
          .eq('id', params.auctionId)
          .eq('winner_user_id', iframeContext.userId)
          .eq('status', 'PENDING_PAYMENT')
          .single()

        if (error) {
          console.error('Error fetching auction:', error)
          toast({
            title: "Error",
            description: "Failed to load your won auction",
            variant: "destructive",
          })
          return
        }

        if (auctionData) {
          setAuction({
            ...auctionData,
            current_bid_amount_cents: auctionData.current_bid?.amount_cents || 0,
            seller_info: auctionData.seller
          })
        }
      } catch (error) {
        console.error('Error loading auction:', error)
        toast({
          title: "Error",
          description: "Failed to load auction data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadAuction()
  }, [params.auctionId])

  const handleClaimAuction = async () => {
    if (!auction) return
    
    setClaiming(true)
    try {
      // Create payment data structure similar to Buy Now
      const paymentData = {
        charge: {
          id: auction.payment_id,
          planId: auction.plan_id
        },
        checkoutSession: {
          id: auction.checkout_session_id
        }
      }

      // Open payment window
      const res = await createInAppPurchase(paymentData)

      if (res.success) {
        toast({
          title: "Payment Window Opened",
          description: "Please complete your payment in the new window to claim your auction win.",
        })
      } else {
        throw new Error(res.error || 'Failed to open payment window')
      }
    } catch (error) {
      console.error('Error claiming auction:', error)
      toast({
        title: "Error",
        description: "Failed to open payment window",
        variant: "destructive",
      })
    } finally {
      setClaiming(false)
    }
  }

  const handleCheckAccess = async () => {
    if (!auction) return
    
    try {
      const response = await fetch('/api/fulfillment/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: context.userId,
          planId: auction.plan_id,
          auctionId: auction.id
        }),
      })

      const result = await response.json()

      if (result.hasAccess) {
        toast({
          title: "Access Confirmed! 🎉",
          description: "You now have access to your purchased item.",
        })
        
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        toast({
          title: "Payment Required",
          description: "Please complete your payment to access this item.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error checking access:', error)
      toast({
        title: "Error",
        description: "Failed to check access status",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading your victory...</p>
        </div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Auction Not Found
            </CardTitle>
            <CardDescription>
              We couldn't find a pending auction win for you. You may have been redirected here by mistake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = `/experiences/${params.experienceId}`}
              className="w-full"
            >
              Return to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalAmount = auction.current_bid_amount_cents + auction.shipping_cost_cents

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">🏆 VICTORY ACHIEVED!</h1>
          <p className="text-gray-300 text-lg">You've won the auction: <span className="font-semibold text-white">{auction.title}</span></p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {auction.type === 'DIGITAL' ? <Download className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              {auction.title}
            </CardTitle>
            <CardDescription>{auction.description}</CardDescription>
            <div className="flex gap-2">
              <Badge variant={auction.type === 'DIGITAL' ? 'default' : 'secondary'}>
                {auction.type}
              </Badge>
              <Badge variant="outline">{auction.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Payment Summary</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Winning Bid:</span>
                    <span>${(auction.current_bid_amount_cents / 100).toFixed(2)}</span>
                  </div>
                  {auction.shipping_cost_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>${(auction.shipping_cost_cents / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 pt-1 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Due:</span>
                      <span>${(totalAmount / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              {auction.seller_info && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Seller Information</h4>
                  <p className="text-blue-700">Seller: {auction.seller_info.username}</p>
                </div>
              )}

              {/* Plan Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Plan Access</h4>
                <p className="text-sm text-gray-600">Plan ID: <span className="font-mono">{auction.plan_id}</span></p>
                <p className="text-sm text-gray-600">Payment ID: <span className="font-mono">{auction.payment_id}</span></p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleClaimAuction}
                  disabled={claiming}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {claiming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening Payment...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Complete Payment & Claim
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleCheckAccess}
                  variant="outline"
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check Access Status
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Important Instructions</p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                      <li>• Click "Complete Payment & Claim" to open the payment window</li>
                      <li>• Complete your payment in the new window</li>
                      <li>• After payment, click "Check Access Status" to verify</li>
                      <li>• Your item will be available in your Barracks once payment is confirmed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => window.location.href = `/experiences/${params.experienceId}`}
            variant="outline"
            className="mr-4"
          >
            Return to Marketplace
          </Button>
          <Button 
            onClick={() => window.location.href = `/experiences/${params.experienceId}/barracks`}
            variant="outline"
          >
            View My Barracks
          </Button>
        </div>
      </div>
    </div>
  )
}
