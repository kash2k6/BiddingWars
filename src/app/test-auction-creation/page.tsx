'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function TestAuctionCreationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const testAuctionCreation = async () => {
    try {
      setLoading(true)

      // Test 1: Get user context
      console.log('Testing user context...')
      const contextResponse = await fetch('/api/whop-context')
      const context = await contextResponse.json()
      console.log('User context:', context)

      if (!contextResponse.ok) {
        throw new Error('Failed to get user context: ' + context.error)
      }

      // Test 2: Create a simple auction
      console.log('Testing auction creation...')
      const auctionData = {
        title: 'Test Auction',
        description: 'This is a test auction',
        type: 'DIGITAL',
        startPriceCents: 1000,
        minIncrementCents: 100,
        communityPct: 5,
        shippingCostCents: 0,
        startsAt: new Date().toISOString().slice(0, 16),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        images: [],
        digitalProduct: {
          deliveryType: 'FILE'
        },
        userId: context.userId,
        experienceId: context.experienceId,
        companyId: context.companyId
      }

      console.log('Auction data:', auctionData)

      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData)
      })

      const result = await response.json()
      console.log('Auction creation result:', result)

      setResult({
        context,
        auctionData,
        response: {
          status: response.status,
          ok: response.ok,
          result
        }
      })

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Test auction created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create test auction",
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error('Test error:', error)
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Test failed",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test Auction Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              This will test auction creation for non-admin users to identify any issues.
            </p>
          </div>

          <Button
            onClick={testAuctionCreation}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Auction Creation"}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
