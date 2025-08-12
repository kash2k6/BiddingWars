'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { getIframeContext } from '@/lib/whop-client'

export default function TestNotificationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTestNotification = async () => {
    try {
      setLoading(true)
      
      // Get Whop context
              const context = await getIframeContext()
      console.log('Whop context:', context)
      
      if (!context.userId || !context.experienceId) {
        toast({
          title: "Error",
          description: "Could not get user context",
          variant: "destructive"
        })
        return
      }

      // Test notification
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: context.userId,
          experienceId: context.experienceId,
          title: "🧪 Test Notification",
          content: "This is a test notification from Bidding Wars!"
        })
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Test notification sent successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send notification",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Test notification error:', error)
      toast({
        title: "Error",
        description: "Failed to send test notification",
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
          <CardTitle>🧪 Test Whop Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Test Whop Push Notifications</Label>
            <p className="text-sm text-gray-600">
              This will send a test notification to your current user account using the Whop API.
            </p>
          </div>
          
          <Button 
            onClick={handleTestNotification} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Sending..." : "Send Test Notification"}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
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
