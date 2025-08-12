"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getWhopContext } from "@/lib/whop-context"

interface AdminUser {
  userId: string
  experienceId: string
  companyId?: string
  isAdmin: boolean
  role: 'owner' | 'admin' | 'user'
  companyName?: string
}

export default function TestAdminPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [context, setContext] = useState<any>(null)

  const testAdminPermissions = async () => {
    setLoading(true)
    try {
      // Get Whop context first
      const whopContext = await getWhopContext()
      setContext(whopContext)
      
      if (!whopContext) {
        throw new Error('Failed to get Whop context')
      }

      // Test admin permissions API
      const response = await fetch('/api/admin/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-whop-user-token': whopContext.userId,
          'x-whop-experience-id': whopContext.experienceId,
          'x-whop-company-id': whopContext.companyId || '',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setAdminUser(data)
        toast({
          title: "Success!",
          description: "Admin permissions API is working correctly.",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Admin permissions API test failed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Admin test error:', error)
      toast({
        title: "Error",
        description: "Failed to test admin permissions API.",
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
          <CardTitle>🛡️ Admin Permissions Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This page tests the admin permissions system and API endpoints.
          </p>
          
          <Button 
            onClick={testAdminPermissions} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Admin Permissions'}
          </Button>

          {/* Whop Context Display */}
          {context && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">📋 Whop Context:</h3>
              <pre className="text-sm text-blue-800 overflow-auto">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          )}

          {/* Admin User Display */}
          {adminUser && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">✅ Admin Check Result:</h3>
              <div className="space-y-1 text-sm text-green-800">
  
                <p><strong>Experience ID:</strong> {adminUser.experienceId}</p>
                <p><strong>Company ID:</strong> {adminUser.companyId || 'None'}</p>
                <p><strong>Company Name:</strong> {adminUser.companyName || 'None'}</p>
                <p><strong>Role:</strong> {adminUser.role}</p>
                <p><strong>Is Admin:</strong> {adminUser.isAdmin ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">🔧 Admin System Features:</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Real-time Whop context extraction</li>
              <li>• Company ownership verification</li>
              <li>• Experience-based admin permissions</li>
              <li>• Secure API endpoint validation</li>
              <li>• Admin dashboard access control</li>
              <li>• Receipt data loading for admins</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
