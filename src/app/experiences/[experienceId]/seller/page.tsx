"use client"

import { useEffect, useState } from "react"
import { getIframeContext } from "@/lib/whop-iframe"
import { supabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/payouts"
import { 
  Package, 
  Download, 
  Truck, 
  DollarSign,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  CheckCircle
} from "lucide-react"

interface SoldItem {
  id: string
  auction_id: string
  title: string
  description: string
  type: 'PHYSICAL' | 'DIGITAL'
  status: string
  amount_cents: number
  paid_at: string
  buyer_info?: {
    username: string
    email: string
  }
  shipping_address?: {
    name: string
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  tracking_number?: string
  shipping_carrier?: string
  payout_status?: string
  seller_amount?: number
  community_amount?: number
  platform_fee?: number
}

export default function SellerPage({ params }: { params: { experienceId: string } }) {
  const { toast } = useToast()
  const [soldItems, setSoldItems] = useState<SoldItem[]>([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)

  const loadSoldItems = async () => {
    try {
      const iframeContext = await getIframeContext()
      setContext(iframeContext)
      
      // Get items sold by the current user
      const { data: items, error } = await supabaseClient
        .from('v_barracks_items')
        .select('*')
        .eq('seller_id', iframeContext.userId)
        .order('paid_at', { ascending: false })

      if (error) {
        console.error('Error fetching sold items:', error)
        toast({
          title: "Error",
          description: "Failed to load your sold items",
          variant: "destructive",
        })
        return
      }

      if (items) {
        console.log('Raw items from database:', items)
        
        // Fetch buyer names for all items
        const uniqueBuyerIds = Array.from(new Set(items.map(item => item.user_id).filter(Boolean)))
        const buyerNamePromises = uniqueBuyerIds.map(async (buyerId) => {
          const buyerName = await fetchBuyerName(buyerId)
          return { [buyerId]: buyerName }
        })
        
        const buyerNameResults = await Promise.all(buyerNamePromises)
        const buyerNames = buyerNameResults.reduce((acc, result) => ({ ...acc, ...result }), {})

        const mappedItems = items.map(item => ({
          id: item.id || item.auction_id,
          auction_id: item.auction_id,
          title: item.title,
          description: item.description,
          type: item.auction_type,
          status: item.barracks_status,
          amount_cents: item.amount_cents,
          paid_at: item.paid_at,
          buyer_info: {
            username: buyerNames[item.user_id] || item.user_id,
            email: `${item.user_id}@example.com`
          },
          shipping_address: item.shipping_address,
          tracking_number: item.tracking_number,
          shipping_carrier: item.shipping_carrier,
          payout_status: item.payout_status,
          seller_amount: item.seller_payout_amount,
          community_amount: item.community_payout_amount,
          platform_fee: item.platform_fee_amount
        }))
        
        console.log('Mapped items with shipping addresses:', mappedItems.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
          shipping_address: item.shipping_address
        })))
        
        setSoldItems(mappedItems)
      }
    } catch (error) {
      console.error('Error loading sold items:', error)
      toast({
        title: "Error",
        description: "Failed to load sold items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBuyerName = async (userId: string): Promise<string> => {
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
      console.error('Error fetching buyer name:', error)
    }
    return userId
  }

  const updateTrackingInfo = async (itemId: string, trackingNumber: string, carrier: string) => {
    try {
      const { error } = await supabaseClient
        .from('barracks_items')
        .update({
          tracking_number: trackingNumber,
          shipping_carrier: carrier,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      setSoldItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, tracking_number: trackingNumber, shipping_carrier: carrier }
          : item
      ))

      toast({
        title: "Success!",
        description: "Tracking information updated",
      })
    } catch (error) {
      console.error('Error updating tracking info:', error)
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadSoldItems()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-white">Loading your sales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
            🛍️ SELLER DASHBOARD 🛍️
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600 font-semibold">SELLER</span>
            {soldItems.filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {soldItems.filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address).length} Ready to Ship
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={loadSoldItems}
          variant="outline"
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/80 to-green-800/80 backdrop-blur-sm border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-white">{soldItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-green-800/80 backdrop-blur-sm border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(soldItems.reduce((sum, item) => sum + (item.seller_amount || 0), 0) * 100)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-green-800/80 backdrop-blur-sm border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Physical Items</p>
                <p className="text-2xl font-bold text-white">
                  {soldItems.filter(item => item.type === 'PHYSICAL').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-green-800/80 backdrop-blur-sm border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Digital Items</p>
                <p className="text-2xl font-bold text-white">
                  {soldItems.filter(item => item.type === 'DIGITAL').length}
                </p>
              </div>
              <Download className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800">
          <TabsTrigger value="all" className="text-white">All Sales</TabsTrigger>
          <TabsTrigger value="ready" className="text-white">
            Ready to Ship
            {soldItems.filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address).length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {soldItems.filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="physical" className="text-white">Physical</TabsTrigger>
          <TabsTrigger value="digital" className="text-white">Digital</TabsTrigger>
          <TabsTrigger value="pending" className="text-white">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldItems.map((item) => (
              <SoldItemCard 
                key={item.id} 
                item={item}
                onUpdateTracking={updateTrackingInfo}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldItems
              .filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address)
              .map((item) => (
                <SoldItemCard 
                  key={item.id} 
                  item={item}
                  onUpdateTracking={updateTrackingInfo}
                />
              ))}
          </div>
          {soldItems.filter(item => item.status === 'PAID' && item.type === 'PHYSICAL' && item.shipping_address).length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Items Ready to Ship</h3>
              <p className="text-gray-500">All your physical items are either shipped or waiting for buyer addresses.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="physical" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldItems
              .filter(item => item.type === 'PHYSICAL')
              .map((item) => (
                <SoldItemCard 
                  key={item.id} 
                  item={item}
                  onUpdateTracking={updateTrackingInfo}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="digital" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldItems
              .filter(item => item.type === 'DIGITAL')
              .map((item) => (
                <SoldItemCard 
                  key={item.id} 
                  item={item}
                  onUpdateTracking={updateTrackingInfo}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldItems
              .filter(item => item.status === 'PENDING_PAYMENT')
              .map((item) => (
                <SoldItemCard 
                  key={item.id} 
                  item={item}
                  onUpdateTracking={updateTrackingInfo}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {soldItems.length === 0 && (
        <Card className="mt-8">
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Sales Yet</h3>
            <p className="text-gray-500 mb-4">You haven't sold any items yet.</p>
            <Button 
              onClick={() => window.location.href = `/experiences/${params.experienceId}/create`}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              Create Your First Listing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SoldItemCard({ 
  item, 
  onUpdateTracking 
}: { 
  item: SoldItem
  onUpdateTracking: (itemId: string, trackingNumber: string, carrier: string) => void
}) {
  const { toast } = useToast()
  const [showTrackingForm, setShowTrackingForm] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(item.tracking_number || '')
  const [carrier, setCarrier] = useState(item.shipping_carrier || '')

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateTracking(item.id, trackingNumber, carrier)
    setShowTrackingForm(false)
  }

  const handleMarkShipped = async () => {
    try {
      const { error } = await supabaseClient
        .from('barracks_items')
        .update({
          status: 'SHIPPED',
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success!",
        description: "Item marked as shipped",
      })

      // Update local state
      window.location.reload() // Refresh to show updated status
    } catch (error) {
      console.error('Error marking as shipped:', error)
      toast({
        title: "Error",
        description: "Failed to mark item as shipped",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDetailView(!showDetailView)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm mb-1 truncate">
              {item.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {item.type === 'DIGITAL' ? <Download className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
              {item.type} Product
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant={item.type === 'DIGITAL' ? 'default' : 'secondary'} className="text-xs">
              {item.type}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                item.status === 'PAID' ? 'bg-green-100 text-green-800' :
                item.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                item.status === 'DELIVERED' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {item.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      {/* Summary View */}
      {!showDetailView && (
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{formatCurrency(item.amount_cents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Buyer:</span>
              <span className="font-medium">{item.buyer_info?.username}</span>
            </div>
            {item.type === 'PHYSICAL' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Address:</span>
                <span className="font-medium">
                  {item.shipping_address ? '✅ Added' : '❌ Missing'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Detailed View */}
      {showDetailView && (
        <CardContent>
          <div className="space-y-4">
            {/* Sale Info */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Amount: {formatCurrency(item.amount_cents)}</p>
              <p className="text-sm text-gray-600">
                Sold: {item.paid_at ? new Date(item.paid_at).toLocaleDateString() : 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">Buyer: {item.buyer_info?.username}</p>
            </div>

            {/* Payout Info */}
            {item.seller_amount && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-green-600 font-medium">Your Payout: {formatCurrency(item.seller_amount * 100)}</p>
                {item.platform_fee && (
                  <p className="text-xs text-gray-600">Platform Fee: {formatCurrency(item.platform_fee * 100)}</p>
                )}
              </div>
            )}

            {/* Physical Item Shipping */}
            {item.type === 'PHYSICAL' && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">Shipping Information</p>
                </div>
                
                {/* Shipping Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Payment</span>
                    <span>Address</span>
                    <span>Shipped</span>
                    <span>Delivered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${item.status === 'PAID' || item.status === 'SHIPPED' || item.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 h-1 ${item.shipping_address ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${item.shipping_address ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 h-1 ${item.status === 'SHIPPED' || item.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${item.status === 'SHIPPED' || item.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex-1 h-1 ${item.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${item.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                </div>
                
                {item.shipping_address ? (
                  <>
                    <div className="text-sm space-y-1 mb-3">
                      <p className="font-medium">{item.shipping_address.name}</p>
                      <p>{item.shipping_address.street}</p>
                      <p>{item.shipping_address.city}, {item.shipping_address.state} {item.shipping_address.zip}</p>
                      <p>{item.shipping_address.country}</p>
                    </div>
                    
                    {/* Shipping Actions */}
                    {item.status === 'PAID' && (
                      <div className="space-y-2">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkShipped()
                          }}
                          className="w-full"
                          size="sm"
                        >
                          📦 Mark as Shipped
                        </Button>
                      </div>
                    )}
                    
                    {/* Tracking Info */}
                    {item.tracking_number ? (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm text-blue-600">Tracking: {item.tracking_number}</p>
                        <p className="text-sm text-blue-600">Carrier: {item.shipping_carrier}</p>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTrackingForm(true)
                          }}
                          className="w-full mt-2"
                          variant="outline"
                          size="sm"
                        >
                          Update Tracking
                        </Button>
                      </div>
                    ) : item.status === 'SHIPPED' && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowTrackingForm(true)
                        }}
                        className="w-full mt-3"
                        size="sm"
                      >
                        Add Tracking Info
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">No shipping address provided yet</p>
                    <p className="text-xs text-gray-500">Waiting for buyer to add shipping address</p>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Form */}
            {showTrackingForm && (
              <form onSubmit={handleTrackingSubmit} className="space-y-2 p-3 bg-gray-50 rounded-md" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Tracking Number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  required
                />
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  required
                >
                  <option value="">Select Carrier</option>
                  <option value="USPS">USPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" size="sm">
                    Save
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setShowTrackingForm(false)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
