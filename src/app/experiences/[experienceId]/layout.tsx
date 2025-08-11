"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"
import { ExcitingLayout } from "@/components/ExcitingLayout"

interface WhopContext {
  userId: string
  experienceId: string
  companyId?: string
}

function ExperienceLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode
  params: { experienceId: string }
}) {
  const [context, setContext] = useState<WhopContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getContext() {
      try {
        const ctx = await getWhopContext()
        
        // Verify that the experience ID from URL matches the Whop context
        if (ctx.experienceId !== params.experienceId) {
          console.error("Experience ID mismatch:", ctx.experienceId, "vs", params.experienceId)
          // Redirect to the correct experience if there's a mismatch
          window.location.href = `/experiences/${ctx.experienceId}`
          return
        }
        
        setContext({
          userId: ctx.userId,
          experienceId: ctx.experienceId,
          companyId: ctx.companyId,
        })
      } catch (error) {
        console.error("Failed to get Whop context:", error)
      } finally {
        setLoading(false)
      }
    }

    getContext()
  }, [params.experienceId])

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

  if (!context) {
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
        </div>
      </div>
    )
  }

  return (
    <ExcitingLayout 
      experienceId={params.experienceId}
      userId={context.userId}
      companyId={context.companyId}
    >
      {children}
    </ExcitingLayout>
  )
}

export default function ExperienceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { experienceId: string }
}) {
  return <ExperienceLayoutContent children={children} params={params} />
}
