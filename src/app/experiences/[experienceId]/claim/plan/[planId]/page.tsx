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

interface BarracksItem {
  id: string
  auction_id: string
  user_id: string
  plan_id: string
  status: 'PENDING_PAYMENT' | 'PAID' | 'FULFILLED'
  amount_cents: number
  created_at: string
  paid_at?: string
  auction: {
    id: string
    title: string
    description: string
    type: 'PHYSICAL' | 'DIGITAL'
    digital_product?: {
      delivery_type: 'FILE' | 'DOWNLOAD_LINK' | 'DISCOUNT_CODE'
      file_url?: string
      download_link?: string
      discount_code?: string
    }
    shipping_cost_cents: number
    seller: {
      username: string
      email: string
    }
  }
}

export default function ClaimByPlanIdPage() {
  const { toast } = useToast()
  const params = useParams()
  const [barracksItem, setBarracksItem] = useState<BarracksItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    const loadBarracksItem = async () => {
      try {
        const iframeContext = await getIframeContext()
        setContext(iframeContext)
        
        // Get the barracks item by plan ID
        const supabase = supabaseClient
        const { data: item, error } = await supabase
          .from('barracks_items')
          .select(`
            *,
            auction:auction_id(
              *,
              seller:created_by_user_id(username, email)
            )
          `)
          .eq('plan_id', params.planId)
          .eq('user_id', iframeContext.userId)
          .single()

        if (error) {
          console.error('Error fetching barracks item:', error)
          toast({
            title: "Error",
            description: "Failed to load your item",
            variant: "destructive",
          })
          return
        }

        if (item) {
          setBarracksItem(item)
        }
      } catch (error) {
        console.error('Error loading barracks item:', error)
        toast({
          title: "Error",
          description: "Failed to load item data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadBarracksItem()
  }, [params.planId])

  const handleClaimItem = async () => {
    if (!barracksItem) return
    
    setClaiming(true)
    try {
      // Create payment data structure
      const paymentData = {
        charge: {
          id: barracksItem.plan_id, // Use plan ID as charge ID
          planId: barracksItem.plan_id
        },
        checkoutSession: {
          id: barracksItem.plan_id // Use plan ID as session ID
        }
      }

      // Open payment window
      const res = await createInAppPurchase(paymentData)

      if (res.success) {
        toast({
          title: "Payment Window Opened",
          description: "Please complete your payment to claim your item.",
        })
      } else {
        throw new Error(res.error || 'Failed to open payment window')
      }
    } catch (error) {
      console.error('Error claiming item:', error)
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
    if (!barracksItem) return
    
    try {
      const response = await fetch('/api/fulfillment/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: context.userId,
          planId: barracksItem.plan_id,
          auctionId: barracksItem.auction_id
        }),
      })

      const result = await response.json()

      if (result.hasAccess) {
        toast({
          title: "Access Confirmed! 🎉",
          description: "You now have access to your item.",
        })
        
        // Update barracks item status
        const supabase = supabaseClient
        await supabase
          .from('barracks_items')
          .update({ status: 'PAID', paid_at: new Date().toISOString() })
          .eq('id', barracksItem.id)
        
        // Refresh the page
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
          <p className="text-white mt-4 text-lg">Loading your item...</p>
        </div>
      </div>
    )
  }

  if (!barracksItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Item Not Found
            </CardTitle>
            <CardDescription>
              We couldn't find an item with this plan ID in your barracks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = `/experiences/${params.experienceId}/barracks`}
              className="w-full"
            >
              Return to Barracks
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalAmount = barracksItem.amount_cents

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">🎯 CLAIM YOUR PRIZE</h1>
          <p className="text-gray-300 text-lg">Plan ID: <span className="font-mono text-white">{barracksItem.plan_id}</span></p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {barracksItem.auction.type === 'DIGITAL' ? <Download className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              {barracksItem.auction.title}
            </CardTitle>
            <CardDescription>{barracksItem.auction.description}</CardDescription>
            <div className="flex gap-2">
              <Badge variant={barracksItem.auction.type === 'DIGITAL' ? 'default' : 'secondary'}>
                {barracksItem.auction.type}
              </Badge>
              <Badge variant="outline">{barracksItem.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Payment Summary</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>${(totalAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              {barracksItem.auction.seller && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Seller Information</h4>
                  <p className="text-blue-700">Seller: {barracksItem.auction.seller.username}</p>
                </div>
              )}

              {/* Plan Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Plan Access</h4>
                <p className="text-sm text-gray-600">Plan ID: <span className="font-mono">{barracksItem.plan_id}</span></p>
                <p className="text-sm text-gray-600">Status: <span className="font-semibold">{barracksItem.status}</span></p>
                <p className="text-sm text-gray-600">Created: {new Date(barracksItem.created_at).toLocaleDateString()}</p>
              </div>

              {/* Action Buttons */}
              {barracksItem.status === 'PENDING_PAYMENT' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleClaimItem}
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
              )}

              {barracksItem.status === 'PAID' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Payment Complete!</p>
                      <p className="text-xs text-green-700 mt-1">You have access to this item.</p>
                    </div>
                  </div>
                </div>
              )}

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
            onClick={() => window.location.href = `/experiences/${params.experienceId}/barracks`}
            variant="outline"
            className="mr-4"
          >
            Return to Barracks
          </Button>
          <Button 
            onClick={() => window.location.href = `/experiences/${params.experienceId}`}
            variant="outline"
          >
            Go to Marketplace
          </Button>
        </div>
      </div>
    </div>
  )
}
