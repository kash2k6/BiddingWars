"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"

function HomePageContent() {
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getContext() {
      try {
        console.log("Attempting to get Whop context...")
        console.log("Current URL:", typeof window !== 'undefined' ? window.location.href : 'No window')
        console.log("URL params:", typeof window !== 'undefined' ? window.location.search : 'No window')
        
        const ctx = await getWhopContext()
        console.log("Whop context received:", ctx)
        setContext(ctx)
      } catch (err) {
        console.error("Failed to get Whop context:", err)
        console.error("Error details:", err)
        setError("This app must be accessed through Whop")
      } finally {
        setLoading(false)
      }
    }

    getContext()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading Whop context...</p>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Whop Context Required</h1>
          <p className="text-muted-foreground mb-4">
            This app must be accessed through a Whop iframe.
          </p>
          <p className="text-sm text-muted-foreground">
            Please ensure you're accessing this app from within your Whop experience.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-2">
              Error: {error}
            </p>
          )}
          <div className="mt-4">
            <a 
              href="/set-context" 
              className="text-blue-600 underline text-sm"
            >
              Set Context for Development
            </a>
          </div>
        </div>
      </div>
    )
  }

  // If we have context, redirect to the experience route
  window.location.href = `/experiences/${context.experienceId}`
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">Redirecting to your experience...</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  return <HomePageContent />
}
