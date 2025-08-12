import { createSdk } from "@whop/iframe"

export const iframeSdk = createSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'test-app-id',
})

// Function to get iframe context
export async function getIframeContext() {
  try {
    console.log("Getting iframe context with SDK...")
    console.log("App ID:", process.env.NEXT_PUBLIC_WHOP_APP_ID)
    console.log("Window parent:", typeof window !== 'undefined' ? (window.parent === window ? 'Same window' : 'Different window') : 'No window')
    
    // For development with whop-proxy, try to get context from URL params first
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId') || urlParams.get('user_id')
      const experienceId = urlParams.get('experienceId') || urlParams.get('experience_id')
      
      if (userId && experienceId) {
        console.log('Using fallback context from URL params for development')
        return {
          userId,
          experienceId,
          companyId: urlParams.get('companyId') || urlParams.get('company_id') || undefined
        }
      }
    }
    
    // For now, use the server API to get context since iframe SDK structure has changed
    const response = await fetch('/api/whop-context')
    if (!response.ok) {
      throw new Error('Failed to get context from server')
    }
    
    const context = await response.json()
    console.log("Context received from server:", context)
    return context
  } catch (error) {
    console.error('Failed to get iframe context:', error)
    
    // For development, if we're using the proxy, try to get context from URL params
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId') || urlParams.get('user_id')
      const experienceId = urlParams.get('experienceId') || urlParams.get('experience_id')
      
      if (userId && experienceId) {
        console.log('Using fallback context from URL params after SDK failure')
        return {
          userId,
          experienceId,
          companyId: urlParams.get('companyId') || urlParams.get('company_id') || undefined
        }
      }
    }
    
    throw error
  }
}

// Function to create in-app purchase
export async function createInAppPurchase(inAppPurchase: any) {
  try {
    console.log('Opening payment modal for:', inAppPurchase)
    console.log('Iframe SDK available:', !!iframeSdk)
    console.log('Iframe SDK methods:', Object.keys(iframeSdk))
    
    // Check if we're in an iframe environment
    if (typeof window !== 'undefined') {
      console.log('Window parent check:', window.parent === window ? 'Same window' : 'Different window')
    }
    
    // Use the iframe SDK to open the payment modal as per Whop documentation
    const result = await iframeSdk.inAppPurchase(inAppPurchase)
    
    console.log('Payment modal result:', result)
    
    if (result.status === "ok") {
      return {
        success: true,
        receiptId: result.data.receipt_id,
        sessionId: result.data.session_id || inAppPurchase.id,
        chargeId: inAppPurchase.id
      }
    } else {
      return {
        success: false,
        error: result.error || 'Payment failed',
        chargeId: inAppPurchase.id,
        sessionId: null,
        receiptId: null
      }
    }
  } catch (error) {
    console.error('Failed to open payment modal:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      inAppPurchase: inAppPurchase
    })
    
    // Fallback: try to open the payment URL directly if iframe SDK fails
    console.log('Trying fallback: opening payment URL directly')
    try {
      const paymentUrl = `https://whop.com/checkout/${inAppPurchase.id}`
      console.log('Opening payment URL:', paymentUrl)
      
      if (typeof window !== 'undefined') {
        const paymentWindow = window.open(paymentUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes')
        
        if (!paymentWindow) {
          throw new Error('Failed to open payment window. Please allow popups and try again.')
        }
        
        console.log('Payment window opened successfully (fallback)')
        
        return {
          success: true,
          chargeId: inAppPurchase.id,
          sessionId: inAppPurchase.id,
          receiptId: inAppPurchase.id,
          paymentUrl: paymentUrl,
          paymentWindow: paymentWindow,
          fallback: true
        }
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }
    
    return {
      success: false,
      error: `Failed to open payment modal: ${error.message}`,
      chargeId: inAppPurchase?.id,
      sessionId: null,
      receiptId: null
    }
  }
}
