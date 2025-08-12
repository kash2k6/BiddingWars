'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const testPayment = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Get user context first
      const contextResponse = await fetch('/api/whop-context')
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()

      console.log('User context:', context)

      // Test the payment
      const response = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: context.userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment test failed')
      }

      setResult(data)
      toast({
        title: "Payment Test Successful!",
        description: "Whop payment integration is working correctly.",
      })

    } catch (error) {
      console.error('Payment test error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      toast({
        title: "Payment Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Whop Payment Integration Test</CardTitle>
          <CardDescription>
            Test the Whop SDK payment integration with a $0.01 charge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testPayment} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing Payment...' : 'Test $0.01 Payment'}
          </Button>

          {result && (
            <div className="mt-4 p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">
                {result.success ? '✅ Test Results' : '❌ Test Failed'}
              </h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600 mt-4">
            <p><strong>What this test does:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Gets your user context from Whop</li>
              <li>Creates a Whop SDK instance with your user ID</li>
              <li>Attempts to charge $0.01 to your account</li>
              <li>Shows the full response from Whop API</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
