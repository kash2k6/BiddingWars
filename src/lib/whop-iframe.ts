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
    
    // const context = await iframeSdk.getContext()
    // console.log("Iframe context received:", context)
    // return context
    
    // For now, throw an error since the SDK structure has changed
    throw new Error('Iframe SDK structure has changed - need to update implementation')
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
export async function createInAppPurchase(planId: string) {
  try {
    // const result = await iframeSdk.inAppPurchase({
    //   planId,
    // })
    // return result
    
    // For now, throw an error since the SDK structure has changed
    throw new Error('Iframe SDK structure has changed - need to update implementation')
  } catch (error) {
    console.error('Failed to create in-app purchase:', error)
    throw error
  }
}
