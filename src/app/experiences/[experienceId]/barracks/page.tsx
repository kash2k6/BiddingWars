'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getIframeContext } from '@/lib/whop-iframe'
import { supabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Package, CheckCircle, AlertCircle, Shield, Medal, Trophy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PayoutBreakdown } from '@/components/PayoutBreakdown'

interface PurchasedItem {
  id: string
  auction_id?: string
  title: string
  description: string
  type: 'PHYSICAL' | 'DIGITAL'
  status: string
  plan_id: string
  paid_at: string
  amount_cents: number
  seller_id?: string
  shipping_cost_cents?: number
  digital_product?: {
    delivery_type: 'FILE' | 'DOWNLOAD_LINK' | 'DISCOUNT_CODE'
    file_url?: string
    download_link?: string
    discount_code?: string
  }
  shipping_address?: any
  tracking_number?: string
  shipping_carrier?: string
  seller_info?: {
    username: string
    email: string
  }
}

export default function BarracksPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const fetchUserName = async (userId: string): Promise<string> => {
    try {
      const response = await fetch(`https://api.whop.com/api/v5/app/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WHOP_API_KEY || 'uywAI0dSirBxNpE0mp46gz-aw03o4e2QaNfODac5hS0'}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        return userData.name || userData.username || userId
      }
    } catch (error) {
      console.error('Error fetching user name:', error)
    }
    return userId
  }

  // Check for payment success redirect
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success')
    const planId = searchParams.get('plan_id')
    
    if (paymentSuccess === 'true' && planId) {
      toast({
        title: "Payment Successful! 🎉",
        description: "Your item has been added to your barracks and is now accessible.",
      })
    }
  }, [searchParams, toast])

  const loadPurchasedItems = async () => {
    try {
      const iframeContext = await getIframeContext()
      setContext(iframeContext)
      
      // Get all items in user's barracks using the view
      const { data: barracksItems, error } = await supabaseClient
        .from('v_barracks_items')
        .select('*')
        .eq('user_id', iframeContext.userId)
        .order('paid_at', { ascending: false })

      if (error) {
        console.error('Error fetching barracks items:', error)
        toast({
          title: "Error",
          description: "Failed to load your barracks items",
          variant: "destructive",
        })
        return
      }

      if (barracksItems) {
        // Fetch user names for all sellers
        const uniqueSellerIds = Array.from(new Set(barracksItems.map(item => item.seller_id).filter(Boolean)))
        const userNamePromises = uniqueSellerIds.map(async (sellerId) => {
          const userName = await fetchUserName(sellerId)
          return { [sellerId]: userName }
        })
        
        const userNameResults = await Promise.all(userNamePromises)
        const newUserNames = userNameResults.reduce((acc, result) => ({ ...acc, ...result }), {})
        setUserNames(newUserNames)

        console.log('Raw barracks items from database:', barracksItems.map(item => ({
          id: item.id,
          auction_id: item.auction_id,
          title: item.title,
          type: item.auction_type
        })))
        
        const mappedItems = barracksItems.map(item => ({
          id: item.id, // Always use the actual barracks_items.id
          auction_id: item.auction_id,
          title: item.title,
          description: item.description,
          type: item.auction_type,
          status: item.barracks_status,
          plan_id: item.plan_id,
          paid_at: item.paid_at,
          amount_cents: item.amount_cents,
          seller_id: item.seller_id,
          digital_product: item.digital_delivery_type ? {
            delivery_type: item.digital_delivery_type,
            file_url: item.digital_file_path,
            download_link: item.digital_download_link,
            discount_code: item.digital_discount_code
          } : undefined,
          shipping_address: item.shipping_address,
          tracking_link: item.tracking_number ? `https://tracking.example.com/${item.tracking_number}` : undefined,
          seller_info: {
            username: newUserNames[item.seller_id] || item.seller_id,
            email: `${item.seller_id}@example.com`
          }
        }))

        // Fetch shipping costs for physical items directly from database
        const itemsWithShippingCosts = await Promise.all(
          mappedItems.map(async (item) => {
            if (item.type === 'PHYSICAL' && item.auction_id) {
              try {
                const { data: auctionData, error: auctionError } = await supabaseClient
                  .from('auctions')
                  .select('shipping_cost_cents')
                  .eq('id', item.auction_id)
                  .single()
                
                if (auctionError) {
                  console.error('Error fetching auction shipping cost:', auctionError)
                } else {
                  console.log('Fetched auction data for shipping cost:', { auctionId: item.auction_id, shippingCost: auctionData.shipping_cost_cents })
                  return { ...item, shipping_cost_cents: auctionData.shipping_cost_cents || 0 }
                }
              } catch (error) {
                console.error('Error fetching auction shipping cost:', error)
              }
            }
            return item
          })
        )

        setPurchasedItems(itemsWithShippingCosts)
      }
    } catch (error) {
      console.error('Error loading purchased items:', error)
      toast({
        title: "Error",
        description: "Failed to load purchased items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPurchasedItems()
  }, [])

  const handleDownload = async (item: PurchasedItem) => {
    if (!item.digital_product?.file_url) return
    
    try {
      const response = await fetch(item.digital_product.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.title}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Download Started",
        description: "Your digital product is being downloaded",
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download the file",
        variant: "destructive",
      })
    }
  }

  const handleMarkAsReceived = async (itemId: string) => {
    try {
      // Update the barracks item status to DELIVERED
      const { error } = await supabaseClient
        .from('barracks_items')
        .update({
          status: 'DELIVERED',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      setPurchasedItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, status: 'DELIVERED' } : item
      ))
      
      toast({
        title: "Success!",
        description: "Item marked as received",
      })
    } catch (error) {
      console.error('Error marking as received:', error)
      toast({
        title: "Error",
        description: "Failed to mark item as received",
        variant: "destructive",
      })
    }
  }

  const handleUpdateShippingAddress = async (itemId: string, shippingAddress: any) => {
    try {
      console.log('Updating shipping address for item:', itemId, shippingAddress)
      console.log('Item ID type:', typeof itemId, 'Value:', itemId)
      
      // If shippingAddress is null, we're clearing the address to allow re-entry
      const updateData = shippingAddress === null 
        ? { shipping_address: null, updated_at: new Date().toISOString() }
        : { shipping_address: shippingAddress, updated_at: new Date().toISOString() }
      
      console.log('Update data being sent to Supabase:', updateData)
      
      const { data, error } = await supabaseClient
        .from('barracks_items')
        .update(updateData)
        .eq('id', itemId)
        .select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Update local state immediately for better UX
      setPurchasedItems(prev => {
        const updated = prev.map(item => 
          item.id === itemId ? { ...item, shipping_address: shippingAddress } : item
        )
        console.log('Updated local state:', updated.find(item => item.id === itemId))
        return updated
      })
      
      // Force a re-render by updating the state again
      setTimeout(() => {
        setPurchasedItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, shipping_address: shippingAddress } : item
        ))
      }, 100)
      
      if (shippingAddress === null) {
        toast({
          title: "Address Cleared",
          description: "You can now enter a new shipping address",
        })
      } else {
        toast({
          title: "Success!",
          description: "Shipping address updated",
        })
      }
    } catch (error) {
      console.error('Error updating shipping address:', error)
      toast({
        title: "Error",
        description: "Failed to update shipping address",
        variant: "destructive",
      })
    }
  }



  const handleRetryPayment = async (item: PurchasedItem) => {
    try {
      // Check if this is a temporary plan_id (from won auction) or needs a real charge
      const isTemporaryPlan = item.plan_id && item.plan_id.startsWith('temp_plan_')
      const needsCharge = !item.plan_id || isTemporaryPlan
      
      if (needsCharge && item.auction_id) {
        console.log('Creating charge for won auction:', item.auction_id)
        
        // Calculate total amount including shipping for physical items
        let totalAmount = item.amount_cents
        let shippingCost = item.shipping_cost_cents || 0
        
        if (item.type === 'PHYSICAL') {
          totalAmount += shippingCost
          console.log('Adding shipping cost for physical item:', { original: item.amount_cents, shipping: shippingCost, total: totalAmount })
        }
        
        const response = await fetch('/api/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: context.userId,
            experienceId: context.experienceId,
            amount: totalAmount,
            currency: 'usd',
            metadata: {
              auctionId: item.auction_id,
              type: 'auction_win',
              originalAmount: item.amount_cents,
              shippingCost: shippingCost,
              itemType: item.type
            }
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create charge')
        }

        const chargeResult = await response.json()
        console.log('Charge created:', chargeResult)

        // Update the barracks item with the new payment info
        const updateResponse = await fetch('/api/barracks/update-payment-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barracksItemId: item.id,
            paymentId: chargeResult.charge.id,
            planId: chargeResult.charge.planId
          })
        })

        if (!updateResponse.ok) {
          console.error('Failed to update barracks item with payment info')
        }

        // Now open the payment modal with the new plan_id
        if (typeof window !== 'undefined' && (window as any).Whop) {
          const whop = (window as any).Whop
          
          const result = await whop.openPurchaseModal({
            planId: chargeResult.charge.planId,
            onSuccess: () => {
              toast({
                title: "Payment Successful! 🎉",
                description: "Your payment has been processed. The item will be available shortly once verified.",
              })
              loadPurchasedItems()
            },
            onError: (error: any) => {
              console.error('Payment error:', error)
              toast({
                title: "Payment Failed",
                description: "There was an issue processing your payment. Please try again.",
                variant: "destructive",
              })
            },
            onClose: () => {
              console.log('Payment modal closed')
            }
          })
        } else {
          // Fallback: redirect to Whop purchase page
          const purchaseUrl = `https://whop.com/checkout/${chargeResult.charge.planId}`
          window.open(purchaseUrl, '_blank')
          
          toast({
            title: "Opening Payment Page",
            description: "Redirecting to payment page in a new tab.",
          })
        }
      } else if (item.plan_id && !isTemporaryPlan) {
        // Real plan_id exists, use it directly
        if (typeof window !== 'undefined' && (window as any).Whop) {
          const whop = (window as any).Whop
          
          const result = await whop.openPurchaseModal({
            planId: item.plan_id,
            onSuccess: () => {
              toast({
                title: "Payment Successful! 🎉",
                description: "Your payment has been processed. The item will be available shortly once verified.",
              })
              loadPurchasedItems()
            },
            onError: (error: any) => {
              console.error('Payment error:', error)
              toast({
                title: "Payment Failed",
                description: "There was an issue processing your payment. Please try again.",
                variant: "destructive",
              })
            },
            onClose: () => {
              console.log('Payment modal closed')
            }
          })
        } else {
          // Fallback: redirect to Whop purchase page
          const purchaseUrl = `https://whop.com/checkout/${item.plan_id}`
          window.open(purchaseUrl, '_blank')
          
          toast({
            title: "Opening Payment Page",
            description: "Redirecting to payment page in a new tab.",
          })
        }
      } else {
        throw new Error('No plan_id available and not an auction win')
      }
    } catch (error) {
      console.error('Error retrying payment:', error)
      toast({
        title: "Error",
        description: "Failed to open payment modal. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleVerifyPayment = async (itemId: string) => {
    try {
      const response = await fetch('/api/barracks/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barracksItemId: itemId })
      })
      if (response.ok) {
        toast({ title: "Payment Verified! 🎉", description: "Item marked as paid for testing." })
        loadPurchasedItems()
      } else {
        toast({ title: "Verification Failed", description: "Failed to verify payment.", variant: "destructive" })
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      toast({ title: "Error", description: "Failed to verify payment.", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading your barracks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">🎖️ MILITARY BARRACKS</h1>
            <Medal className="h-12 w-12 text-yellow-400" />
          </div>
          <p className="text-gray-300 text-lg">Your acquired assets and mission equipment</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                <span className="text-lg font-semibold">Total Purchases</span>
              </div>
              <p className="text-3xl font-bold mt-2">{purchasedItems.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600 to-green-800 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Download className="h-6 w-6" />
                <span className="text-lg font-semibold">Digital Assets</span>
              </div>
              <p className="text-3xl font-bold mt-2">
                {purchasedItems.filter(item => item.type === 'DIGITAL').length}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-600 to-orange-800 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                <span className="text-lg font-semibold">Physical Items</span>
              </div>
              <p className="text-3xl font-bold mt-2">
                {purchasedItems.filter(item => item.type === 'PHYSICAL').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="all" className="text-white">All Assets</TabsTrigger>
            <TabsTrigger value="digital" className="text-white">Digital</TabsTrigger>
            <TabsTrigger value="physical" className="text-white">Physical</TabsTrigger>
            <TabsTrigger value="pending" className="text-white">Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems.map((item) => (
                <PurchasedItemCard 
                  key={item.id} 
                  item={item} 
                  context={context}
                  onDownload={handleDownload}
                  onMarkReceived={handleMarkAsReceived}
                  onUpdateShippingAddress={handleUpdateShippingAddress}
                  onRetryPayment={handleRetryPayment}
                  onVerifyPayment={handleVerifyPayment}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="digital" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems
                .filter(item => item.type === 'DIGITAL')
                .map((item) => (
                  <PurchasedItemCard 
                    key={item.id} 
                    item={item} 
                    context={context}
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
                    onUpdateShippingAddress={handleUpdateShippingAddress}
                    onRetryPayment={handleRetryPayment}
                    onVerifyPayment={handleVerifyPayment}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="physical" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems
                .filter(item => item.type === 'PHYSICAL')
                .map((item) => (
                  <PurchasedItemCard 
                    key={item.id} 
                    item={item} 
                    context={context}
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
                    onUpdateShippingAddress={handleUpdateShippingAddress}
                    onRetryPayment={handleRetryPayment}
                    onVerifyPayment={handleVerifyPayment}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems
                .filter(item => item.status === 'PENDING_PAYMENT')
                .map((item) => (
                  <PurchasedItemCard 
                    key={item.id} 
                    item={item} 
                    context={context}
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
                    onUpdateShippingAddress={handleUpdateShippingAddress}
                    onRetryPayment={handleRetryPayment}
                    onVerifyPayment={handleVerifyPayment}
                  />
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {purchasedItems.length === 0 && (
          <Card className="mt-8">
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Assets Yet</h3>
              <p className="text-gray-500 mb-4">You haven't purchased any items yet.</p>
              <Button 
                onClick={() => window.location.href = `/experiences/${params.experienceId}`}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                Go to Marketplace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ShippingAddressForm({ onSubmit }: { onSubmit: (address: any) => void }) {
  const [address, setAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('ShippingAddressForm submitting address:', address)
    onSubmit(address)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        placeholder="Full Name"
        value={address.name}
        onChange={(e) => setAddress(prev => ({ ...prev, name: e.target.value }))}
        className="w-full p-2 border rounded-md text-sm"
        required
      />
      <input
        type="text"
        placeholder="Street Address"
        value={address.street}
        onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
        className="w-full p-2 border rounded-md text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="City"
          value={address.city}
          onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
          className="w-full p-2 border rounded-md text-sm"
          required
        />
        <input
          type="text"
          placeholder="State"
          value={address.state}
          onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
          className="w-full p-2 border rounded-md text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="ZIP Code"
          value={address.zip}
          onChange={(e) => setAddress(prev => ({ ...prev, zip: e.target.value }))}
          className="w-full p-2 border rounded-md text-sm"
          required
        />
        <select
          value={address.country}
          onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
          className="w-full p-2 border rounded-md text-sm"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="UK">United Kingdom</option>
        </select>
      </div>
      <Button type="submit" className="w-full">
        Save Shipping Address
      </Button>
    </form>
  )
}

function PurchasedItemCard({ 
  item, 
  context,
  onDownload, 
  onMarkReceived,
  onUpdateShippingAddress,
  onRetryPayment,
  onVerifyPayment
}: { 
  item: PurchasedItem
  context: any
  onDownload: (item: PurchasedItem) => void
  onMarkReceived: (itemId: string) => void
  onUpdateShippingAddress: (itemId: string, shippingAddress: any) => void
  onRetryPayment: (item: PurchasedItem) => void
  onVerifyPayment: (itemId: string) => void
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
                  <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm mb-1 truncate">
                {item.title}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {item.type === 'DIGITAL' ? <Download className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                {item.type} Product
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Badge variant={item.type === 'DIGITAL' ? 'default' : 'secondary'} className="text-xs">
                {item.type}
              </Badge>
              <Badge variant="outline" className="text-xs">{item.status}</Badge>
            </div>
          </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Plan Access Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Plan ID: <span className="font-mono">{item.plan_id}</span></p>
            <p className="text-sm text-gray-600">Amount: ${(item.amount_cents / 100).toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              {item.paid_at ? 
                `Purchased: ${new Date(item.paid_at).toLocaleDateString()}` : 
                `Status: ${item.status}`
              }
            </p>
          </div>

          {/* Seller Info */}
          {item.seller_info && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-600">Seller: {item.seller_info.username}</p>
            </div>
          )}

          {/* Payout Breakdown for Auction Items - Only show to seller */}
          {item.auction_id && item.status === 'PAID' && context?.userId === item.seller_id && (
            <PayoutBreakdown 
              totalAmount={item.amount_cents / 100} 
              showDetails={true}
            />
          )}

          {/* Digital Product */}
          {item.type === 'DIGITAL' && item.digital_product && item.status === 'PAID' && (
            <div className="space-y-2">
              <h4 className="font-semibold">Digital Product</h4>
              
              {item.digital_product.delivery_type === 'FILE' && item.digital_product.file_url && (
                <Button onClick={() => onDownload(item)} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download {item.title}
                </Button>
              )}
              
              {item.digital_product.delivery_type === 'DOWNLOAD_LINK' && item.digital_product.download_link && (
                <a 
                  href={item.digital_product.download_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-100 rounded-md text-blue-600 hover:bg-gray-200 transition-colors text-center"
                >
                  Access Download Link
                </a>
              )}
              
              {item.digital_product.delivery_type === 'DISCOUNT_CODE' && item.digital_product.discount_code && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm text-gray-600">Discount Code:</p>
                  <div className="font-mono text-lg text-center mt-1">{item.digital_product.discount_code}</div>
                </div>
              )}
            </div>
          )}

          {/* Pending Payment Notice */}
          {item.status === 'PENDING_PAYMENT' && (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    {item.type === 'DIGITAL' 
                      ? 'Payment pending. Digital content will be available once payment is confirmed.'
                      : 'Payment pending. Physical item will be shipped once payment is confirmed.'
                    }
                  </p>
                </div>
                {item.type === 'PHYSICAL' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Shipping Cost:</strong> ${((item.shipping_cost_cents || 0) / 100).toFixed(2)} will be added to your payment
                    </p>
                  </div>
                )}
              </div>
              
              {/* Pay Now Button */}
              <Button 
                onClick={() => onRetryPayment(item)} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                💳 Pay Now
              </Button>
              
              {/* Manual Verify Button (for testing) */}
              <Button 
                onClick={() => onVerifyPayment(item.id)} 
                className="w-full bg-purple-600 hover:bg-purple-700"
                variant="outline"
              >
                🔍 Verify Payment (Test)
              </Button>
            </div>
          )}

          {/* Physical Product */}
          {item.type === 'PHYSICAL' && (
            <div className="space-y-2">
              <h4 className="font-semibold">Physical Product</h4>
              
              {console.log('Rendering address section for item:', item.id, 'shipping_address:', item.shipping_address)}
              {!item.shipping_address ? (
                <ShippingAddressForm 
                  key={`form-${item.id}`}
                  onSubmit={(address) => onUpdateShippingAddress(item.id, address)}
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm text-gray-600 font-medium mb-2">Shipping Address:</p>
                  <div className="text-sm space-y-1">
                    <p>{item.shipping_address.name}</p>
                    <p>{item.shipping_address.street}</p>
                    <p>{item.shipping_address.city}, {item.shipping_address.state} {item.shipping_address.zip}</p>
                    <p>{item.shipping_address.country}</p>
                  </div>
                  <Button 
                    onClick={() => onUpdateShippingAddress(item.id, null)} 
                    className="w-full mt-3"
                    variant="outline"
                    size="sm"
                  >
                    Update Address
                  </Button>
                </div>
              )}
              
              {/* Shipping Status */}
              <div className="p-3 bg-gray-100 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 font-medium">Shipping Status:</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      item.status === 'PAID' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.status === 'PAID' ? 'Awaiting Shipment' :
                     item.status === 'SHIPPED' ? 'Shipped' :
                     item.status === 'DELIVERED' ? 'Delivered' : item.status}
                  </Badge>
                </div>
                
                {item.status === 'PAID' && (
                  <p className="text-xs text-gray-500">Seller will ship once payment is confirmed</p>
                )}
                
                {item.status === 'SHIPPED' && !item.tracking_number && (
                  <p className="text-xs text-gray-500">Item has been shipped, tracking info coming soon</p>
                )}
              </div>
              
              {/* Tracking Info */}
              {item.tracking_number && (
                <div className="space-y-2">
                  <a 
                    href={`https://tracking.example.com/${item.tracking_number}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 bg-blue-100 rounded-md text-blue-600 hover:bg-blue-200 transition-colors text-center"
                  >
                    📦 Track Package ({item.shipping_carrier})
                  </a>
                  
                  {item.status === 'SHIPPED' && (
                    <Button 
                      onClick={() => onMarkReceived(item.id)} 
                      className="w-full"
                    >
                      ✅ Mark as Received
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
