// Function to get iframe context - only call in browser
export async function getIframeContext() {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Not in browser environment')
    }

    // For development with whop-proxy, try to get context from localStorage first
    if (process.env.NODE_ENV === 'development') {
      const storedContext = localStorage.getItem('whop-context')
      if (storedContext) {
        try {
          const parsed = JSON.parse(storedContext)
          console.log('Using stored Whop context:', parsed)
          return parsed
        } catch (e) {
          console.log('Failed to parse stored context, trying SDK...')
        }
      }
    }

    // Import dynamically to avoid SSR issues
    const { WhopClientSdk } = await import('@whop/api')
    const whopClient = WhopClientSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'test-app-id'
    })

    // Try to get context from Whop SDK
    const context = await whopClient.iframe.getContext()
    
    // If we get here, we have a valid context
    console.log('Whop context retrieved successfully:', context)
    
    // Store for development
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('whop-context', JSON.stringify(context))
    }
    
    return context
  } catch (error) {
    console.error('Failed to get Whop iframe context:', error)
    
    // For development, if we're using the proxy, try to get context from URL params
    if (process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId') || urlParams.get('user_id')
      const experienceId = urlParams.get('experienceId') || urlParams.get('experience_id')
      
      if (userId && experienceId) {
        console.log('Using fallback context from URL params')
        const fallbackContext = {
          userId,
          experienceId,
          companyId: urlParams.get('companyId') || urlParams.get('company_id')
        }
        localStorage.setItem('whop-context', JSON.stringify(fallbackContext))
        return fallbackContext
      }
    }
    
    throw error
  }
}

// Function to get user ledger account
export async function getUserLedgerAccount(userId: string) {
  try {
    const { WhopClientSdk } = await import('@whop/api')
    const whopClient = WhopClientSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'test-app-id'
    })
    
    const result = await whopClient.users.getUserLedgerAccount({
      userId,
    })
    return result
  } catch (error) {
    console.error('Failed to get user ledger account:', error)
    throw error
  }
}

// Function to create in-app purchase
export async function createInAppPurchase(planId: string) {
  try {
    const { WhopClientSdk } = await import('@whop/api')
    const whopClient = WhopClientSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'test-app-id'
    })
    
    const result = await whopClient.iframe.inAppPurchase({
      planId,
    })
    return result
  } catch (error) {
    console.error('Failed to create in-app purchase:', error)
    throw error
  }
}
