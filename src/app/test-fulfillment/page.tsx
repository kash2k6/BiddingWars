"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function TestFulfillmentPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const testFulfillmentAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/fulfillment/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auctionId: 'test-auction-id',
          experienceId: 'test-experience-id',
          action: 'mark_shipped',
          trackingNumber: 'TEST123456',
          shippingCarrier: 'USPS'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Fulfillment API is working correctly.",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Fulfillment API test failed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test fulfillment API.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Fulfillment System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This page tests the fulfillment system components and API endpoints.
          </p>
          
          <Button 
            onClick={testFulfillmentAPI} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Fulfillment API'}
          </Button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">✅ Fulfillment Features Implemented:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Physical Product Fulfillment Component</li>
              <li>• Digital Product Delivery Component</li>
              <li>• Address Collection for Physical Items</li>
              <li>• Tracking Information Management</li>
              <li>• Mark as Shipped/Received</li>
              <li>• File Upload to Supabase Storage</li>
              <li>• Secure Download Links</li>
              <li>• Fulfillment Status API</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
