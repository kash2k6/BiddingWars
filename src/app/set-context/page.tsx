"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { setWhopContext } from "@/lib/whop-context"

export default function SetContextPage() {
  const [message, setMessage] = useState("")

  const setTestContext = () => {
    const context = {
      userId: "user_ojPhs9dIhFQ9C",
      experienceId: "exp_hxtkjfMPOH3rWW",
      companyId: undefined
    }
    
    setWhopContext(context)
    setMessage("Context set! Go back to the main app.")
  }

  const clearContext = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whop-context')
      setMessage("Context cleared!")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Set Whop Context (Development)</h1>
        
        <div className="space-y-2">
          <Button onClick={setTestContext} className="w-full">
            Set Test Context
          </Button>
          <Button onClick={clearContext} variant="outline" className="w-full">
            Clear Context
          </Button>
        </div>
        
        {message && (
          <div className="p-3 bg-green-100 text-green-800 rounded-md">
            {message}
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          <p>This sets context for testing. After setting, go to <a href="/" className="text-blue-600 underline">the main app</a>.</p>
        </div>
      </div>
    </div>
  )
}
