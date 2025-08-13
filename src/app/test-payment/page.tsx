"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getIframeContext, createInAppPurchase, openPurchaseModal } from "@/lib/whop-client"

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [testResults, setTestResults] = useState<string[]>([])
  const { toast } = useToast()

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testGetContext = async () => {
    try {
      setLoading(true)
      addResult("Testing getIframeContext...")
      
      const ctx = await getIframeContext()
      setContext(ctx)
      addResult(`✅ Context retrieved: ${JSON.stringify(ctx, null, 2)}`)
      
      toast({
        title: "Context Retrieved",
        description: "Successfully got Whop iframe context",
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addResult(`❌ Context failed: ${errorMsg}`)
      
      toast({
        title: "Context Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testCreateCharge = async () => {
    if (!context) {
      addResult("❌ No context available. Get context first.")
      return
    }

    try {
      setLoading(true)
      addResult("Testing charge creation...")
      
      const response = await fetch("/api/charge", {
        method: "POST",
        body: JSON.stringify({ 
          userId: context.userId, 
          experienceId: context.experienceId,
          amount: 1000, // $10.00
          currency: 'usd',
          metadata: {
            type: 'test_payment'
          }
        }),
      })
      
      if (response.ok) {
        const chargeResult = await response.json()
        addResult(`✅ Charge created: ${JSON.stringify(chargeResult, null, 2)}`)
        
        toast({
          title: "Charge Created",
          description: "Successfully created test charge",
        })
        
        return chargeResult
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create charge")
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addResult(`❌ Charge failed: ${errorMsg}`)
      
      toast({
        title: "Charge Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testInAppPurchase = async () => {
    if (!context) {
      addResult("❌ No context available. Get context first.")
      return
    }

    try {
      setLoading(true)
      addResult("Testing in-app purchase...")
      
      // First create a charge
      const chargeResult = await testCreateCharge()
      if (!chargeResult) {
        addResult("❌ Cannot test in-app purchase without charge")
        return
      }
      
      // Then test the in-app purchase
      const res = await createInAppPurchase(chargeResult.charge)
      
      if (res.success) {
        addResult(`✅ In-app purchase successful: ${JSON.stringify(res, null, 2)}`)
        
        toast({
          title: "In-App Purchase Success",
          description: "Successfully completed in-app purchase",
        })
      } else {
        addResult(`❌ In-app purchase failed: ${res.error}`)
        
        toast({
          title: "In-App Purchase Failed",
          description: res.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addResult(`❌ In-app purchase error: ${errorMsg}`)
      
      toast({
        title: "In-App Purchase Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testPurchaseModal = async () => {
    if (!context) {
      addResult("❌ No context available. Get context first.")
      return
    }

    try {
      setLoading(true)
      addResult("Testing purchase modal...")
      
      // First create a charge
      const chargeResult = await testCreateCharge()
      if (!chargeResult) {
        addResult("❌ Cannot test purchase modal without charge")
        return
      }
      
      // Then test the purchase modal
      const res = await openPurchaseModal(chargeResult.charge.planId, {
        onSuccess: () => {
          addResult("✅ Purchase modal success callback triggered")
          toast({
            title: "Purchase Modal Success",
            description: "Purchase modal completed successfully",
          })
        },
        onError: (error: any) => {
          addResult(`❌ Purchase modal error callback: ${error?.message || 'Unknown error'}`)
          toast({
            title: "Purchase Modal Error",
            description: error?.message || 'Unknown error',
            variant: "destructive",
          })
        },
        onClose: () => {
          addResult("ℹ️ Purchase modal closed")
        }
      })
      
      addResult(`ℹ️ Purchase modal opened: ${JSON.stringify(res, null, 2)}`)
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addResult(`❌ Purchase modal error: ${errorMsg}`)
      
      toast({
        title: "Purchase Modal Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Whop Payment Integration Test</CardTitle>
          <CardDescription>
            Test the new payment implementation based on whop-app-call-it patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Context Display */}
          {context && (
            <div className="p-4 bg-slate-100 rounded-lg">
              <h3 className="font-semibold mb-2">Current Context:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          )}

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testGetContext} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "1. Test Get Context"}
            </Button>
            
            <Button 
              onClick={testCreateCharge} 
              disabled={loading || !context}
              className="w-full"
            >
              {loading ? "Testing..." : "2. Test Create Charge"}
            </Button>
            
            <Button 
              onClick={testInAppPurchase} 
              disabled={loading || !context}
              className="w-full"
            >
              {loading ? "Testing..." : "3. Test In-App Purchase"}
            </Button>
            
            <Button 
              onClick={testPurchaseModal} 
              disabled={loading || !context}
              className="w-full"
            >
              {loading ? "Testing..." : "4. Test Purchase Modal"}
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Test Results:</h3>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
            
            <div className="h-64 overflow-y-auto p-4 bg-slate-50 rounded-lg border">
              {testResults.length === 0 ? (
                <p className="text-gray-500">No test results yet. Run a test to see results here.</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
