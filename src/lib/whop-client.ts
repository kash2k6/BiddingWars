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

    // Use the iframe SDK instead of client SDK for context
    const { getIframeContext: getIframeContextFromSDK } = await import('@/lib/whop-iframe')
    const context = await getIframeContextFromSDK()
    
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
    // Use the server API instead of client SDK for ledger account
    const response = await fetch('/api/whop/ledger-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch ledger account')
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to get user ledger account:', error)
    throw error
  }
}

// Function to create in-app purchase
export async function createInAppPurchase(planId: string) {
  try {
    // Use the iframe SDK instead of client SDK for in-app purchases
    const { createInAppPurchase: createInAppPurchaseFromSDK } = await import('@/lib/whop-iframe')
    const result = await createInAppPurchaseFromSDK(planId)
    return result
  } catch (error) {
    console.error('Failed to create in-app purchase:', error)
    throw error
  }
}
