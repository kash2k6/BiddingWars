'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getIframeContext } from '@/lib/whop-iframe'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Package, CheckCircle, AlertCircle, Shield, Medal, Trophy } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PurchasedItem {
  id: string
  title: string
  description: string
  type: 'PHYSICAL' | 'DIGITAL'
  status: string
  plan_id: string
  paid_at: string
  digital_product?: {
    delivery_type: 'FILE' | 'DOWNLOAD_LINK' | 'DISCOUNT_CODE'
    file_url?: string
    download_link?: string
    discount_code?: string
  }
  shipping_address?: string
  tracking_link?: string
  seller_info?: {
    username: string
    email: string
  }
}

export default function BarracksPage() {
  const params = useParams()
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    const loadPurchasedItems = async () => {
      try {
        const iframeContext = await getIframeContext()
        setContext(iframeContext)
        
        // Get all auctions won by this user
        const supabase = createClient()
        const { data: auctions, error } = await supabase
          .from('auctions')
          .select(`
            *,
            seller:created_by_user_id(username, email)
          `)
          .eq('winner_user_id', iframeContext.userId)
          .eq('status', 'PAID')
          .order('paid_at', { ascending: false })

        if (error) {
          console.error('Error fetching purchased items:', error)
          toast({
            title: "Error",
            description: "Failed to load your purchased items",
            variant: "destructive",
          })
          return
        }

        if (auctions) {
          setPurchasedItems(auctions.map(auction => ({
            ...auction,
            seller_info: auction.seller
          })))
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
      const supabase = createClient()
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'FULFILLED' })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      setPurchasedItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, status: 'FULFILLED' } : item
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
                  onDownload={handleDownload}
                  onMarkReceived={handleMarkAsReceived}
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
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
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
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
                  />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedItems
                .filter(item => item.status === 'PAID')
                .map((item) => (
                  <PurchasedItemCard 
                    key={item.id} 
                    item={item} 
                    onDownload={handleDownload}
                    onMarkReceived={handleMarkAsReceived}
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

function PurchasedItemCard({ 
  item, 
  onDownload, 
  onMarkReceived 
}: { 
  item: PurchasedItem
  onDownload: (item: PurchasedItem) => void
  onMarkReceived: (itemId: string) => void
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {item.type === 'DIGITAL' ? <Download className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              {item.title}
            </CardTitle>
            <CardDescription className="mt-2">{item.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={item.type === 'DIGITAL' ? 'default' : 'secondary'}>
              {item.type}
            </Badge>
            <Badge variant="outline">{item.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Plan Access Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Plan ID: <span className="font-mono">{item.plan_id}</span></p>
            <p className="text-sm text-gray-600">Purchased: {new Date(item.paid_at).toLocaleDateString()}</p>
          </div>

          {/* Seller Info */}
          {item.seller_info && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-600">Seller: {item.seller_info.username}</p>
            </div>
          )}

          {/* Digital Product */}
          {item.type === 'DIGITAL' && item.digital_product && (
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

          {/* Physical Product */}
          {item.type === 'PHYSICAL' && (
            <div className="space-y-2">
              <h4 className="font-semibold">Physical Product</h4>
              
              {item.shipping_address && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm text-gray-600">Shipping Address:</p>
                  <p className="text-sm">{item.shipping_address}</p>
                </div>
              )}
              
              {item.tracking_link && (
                <a 
                  href={item.tracking_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-100 rounded-md text-blue-600 hover:bg-gray-200 transition-colors text-center"
                >
                  Track Package
                </a>
              )}
              
              {item.status === 'PAID' && (
                <Button 
                  onClick={() => onMarkReceived(item.id)} 
                  className="w-full"
                >
                  Mark as Received
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
