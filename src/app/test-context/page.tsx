"use client"

import { useEffect, useState } from "react"
import { getIframeContext } from "@/lib/whop-client"

export default function TestContextPage() {
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testContext() {
      try {
        console.log("Testing Whop context...")
        const ctx = await getIframeContext()
        console.log("Whop context received:", ctx)
        setContext(ctx)
      } catch (err: any) {
        console.error("Whop context error:", err)
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    testContext()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Testing Whop context...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Whop Context Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded-lg text-left max-w-md mx-auto">
            <h2 className="font-semibold mb-2">Debug Info:</h2>
            <p>Window parent: {typeof window !== 'undefined' ? (window.parent === window ? 'Same window' : 'Different window') : 'No window'}</p>
            <p>App ID: {process.env.NEXT_PUBLIC_WHOP_APP_ID || 'Not set'}</p>
            <p>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'No user agent'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Whop Context Success!</h1>
        <div className="bg-green-100 p-4 rounded-lg text-left max-w-md mx-auto">
          <h2 className="font-semibold mb-2">Context Data:</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(context, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
