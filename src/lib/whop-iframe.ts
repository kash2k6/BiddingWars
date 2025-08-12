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
export async function createInAppPurchase(paymentData: any) {
  try {
    console.log('Processing payment data:', paymentData)
    console.log('Payment data keys:', Object.keys(paymentData))
    
    // Extract checkout session ID from the payment data
    const checkoutSessionId = paymentData.checkoutSession?.id || paymentData.id
    console.log('Using checkout session ID:', checkoutSessionId)
    
    if (!checkoutSessionId) {
      console.error('No checkout session ID found. Payment data:', paymentData)
      throw new Error('No checkout session ID found in payment data')
    }
    
    // Use the checkout session ID for the checkout URL
    const checkoutUrl = `https://whop.com/checkout/${checkoutSessionId}`
    console.log('Opening checkout URL:', checkoutUrl)
    
    if (typeof window !== 'undefined') {
      console.log('Attempting to open payment window...')
      
      // Open checkout URL in a new window/tab
      const paymentWindow = window.open(checkoutUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes')
      
      console.log('Payment window result:', paymentWindow)
      
      if (!paymentWindow) {
        console.error('Failed to open payment window - popup blocked?')
        throw new Error('Failed to open payment window. Please allow popups and try again.')
      }
      
      console.log('Payment window opened successfully')
      
      return {
        success: true,
        chargeId: paymentData.charge?.id || paymentData.id,
        sessionId: checkoutSessionId,
        receiptId: checkoutSessionId,
        paymentUrl: checkoutUrl,
        paymentWindow: paymentWindow
      }
    } else {
      throw new Error('Not in browser environment')
    }
  } catch (error) {
    console.error('Failed to open payment:', error)
    
    return {
      success: false,
      error: `Failed to open payment: ${error.message}`,
      chargeId: paymentData?.charge?.id || paymentData?.id,
      sessionId: null,
      receiptId: null
    }
  }
}
