'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getIframeContext } from '@/lib/whop-iframe'
import { supabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Auction {
  id: string
  title: string
  description: string
  type: 'PHYSICAL' | 'DIGITAL'
  winner_user_id: string
  status: string
  digital_product?: {
    delivery_type: 'FILE' | 'DOWNLOAD_LINK' | 'DISCOUNT_CODE'
    file_url?: string
    download_link?: string
    discount_code?: string
  }
  shipping_address?: string
  tracking_link?: string
}

export default function ClaimPage() {
  const { toast } = useToast()
  const params = useParams()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const iframeContext = await getIframeContext()
        setContext(iframeContext)
        
        // Find the auction that was won by this user
        const supabase = supabaseClient
        const { data: auctions, error } = await supabase
          .from('auctions')
          .select('*')
          .eq('winner_user_id', iframeContext.userId)
          .eq('status', 'PAID')
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error fetching auction:', error)
          toast({
            title: "Error",
            description: "Failed to load your winning auction",
            variant: "destructive",
          })
          return
        }

        if (auctions && auctions.length > 0) {
          setAuction(auctions[0])
        }
      } catch (error) {
        console.error('Error loading claim data:', error)
        toast({
          title: "Error",
          description: "Failed to load claim data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleDownload = async () => {
    if (!auction?.digital_product?.file_url) return
    
    try {
      const response = await fetch(auction.digital_product.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${auction.title}.zip`
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

  const handleMarkAsReceived = async () => {
    if (!auction) return
    
    setClaiming(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'FULFILLED' })
        .eq('id', auction.id)

      if (error) {
        throw error
      }

      setAuction(prev => prev ? { ...prev, status: 'FULFILLED' } : null)
      
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
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading your purchase...</p>
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
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              No Purchase Found
            </CardTitle>
            <CardDescription>
              We couldn't find a recent purchase to claim. You may have been redirected here by mistake.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">🎉 Purchase Complete!</h1>
          <p className="text-gray-300 text-lg">You've successfully won: <span className="font-semibold text-white">{auction.title}</span></p>
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
            {auction.type === 'DIGITAL' ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Digital Product Delivery</h3>
                
                {auction.digital_product?.delivery_type === 'FILE' && auction.digital_product?.file_url && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Your digital product is ready for download:</p>
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download {auction.title}
                    </Button>
                  </div>
                )}
                
                {auction.digital_product?.delivery_type === 'DOWNLOAD_LINK' && auction.digital_product?.download_link && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Download link:</p>
                    <a 
                      href={auction.digital_product.download_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-gray-100 rounded-md text-blue-600 hover:bg-gray-200 transition-colors"
                    >
                      {auction.digital_product.download_link}
                    </a>
                  </div>
                )}
                
                {auction.digital_product?.delivery_type === 'DISCOUNT_CODE' && auction.digital_product?.discount_code && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Your discount code:</p>
                    <div className="p-3 bg-gray-100 rounded-md font-mono text-lg text-center">
                      {auction.digital_product.discount_code}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Physical Product Shipping</h3>
                
                {auction.shipping_address && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Shipping address:</p>
                    <div className="p-3 bg-gray-100 rounded-md">
                      {auction.shipping_address}
                    </div>
                  </div>
                )}
                
                {auction.tracking_link && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Tracking link:</p>
                    <a 
                      href={auction.tracking_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-gray-100 rounded-md text-blue-600 hover:bg-gray-200 transition-colors"
                    >
                      Track Your Package
                    </a>
                  </div>
                )}
                
                {auction.status === 'PAID' && (
                  <Button 
                    onClick={handleMarkAsReceived} 
                    disabled={claiming}
                    className="w-full"
                  >
                    {claiming ? 'Marking...' : 'Mark as Received'}
                  </Button>
                )}
              </div>
            )}
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
            onClick={() => window.location.href = `/experiences/${params.experienceId}/my-bids`}
            variant="outline"
          >
            View My Bids
          </Button>
        </div>
      </div>
    </div>
  )
}
