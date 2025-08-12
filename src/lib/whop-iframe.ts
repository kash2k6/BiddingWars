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
export async function createInAppPurchase(chargeId: string) {
  try {
    console.log('Processing payment for charge:', chargeId)
    
    // For development, simulate the payment flow
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Simulating payment completion')
      
      // In development, we'll simulate a successful payment after a delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return {
        success: true,
        chargeId,
        sessionId: chargeId,
        receiptId: chargeId,
        isDevelopment: true
      }
    }
    
    // In production, use the iframe SDK to open the payment modal
    try {
      // Try to use the iframe SDK to process the charge
      const result = await iframeSdk.inAppPurchase.process({
        chargeId: chargeId
      })
      
      console.log('Payment processing result:', result)
      
      return {
        success: true,
        chargeId,
        sessionId: result.id || chargeId,
        receiptId: result.id || chargeId
      }
    } catch (sdkError) {
      console.error('Iframe SDK failed, trying alternative approach:', sdkError)
      
      // Alternative: redirect to the charge URL or show payment instructions
      const chargeUrl = `https://whop.com/checkout/${chargeId}`
      console.log('Redirecting to charge URL:', chargeUrl)
      
      // Open the payment URL in a new window/tab
      if (typeof window !== 'undefined') {
        window.open(chargeUrl, '_blank')
      }
      
      return {
        success: true,
        chargeId,
        sessionId: chargeId,
        receiptId: chargeId,
        redirectUrl: chargeUrl
      }
    }
  } catch (error) {
    console.error('Failed to process payment:', error)
    
    return {
      success: false,
      error: 'Payment processing failed. Please try again or contact support.',
      chargeId,
      sessionId: null,
      receiptId: null
    }
  }
}
