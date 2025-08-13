import { createSdk } from '@whop/iframe'

let iframeSdk: any = null

// Initialize the iframe SDK
async function getIframeSdk(): Promise<any> {
  if (iframeSdk) {
    return iframeSdk
  }

  if (typeof window === 'undefined') {
    throw new Error('Iframe SDK can only be used in browser environment')
  }

  try {
    iframeSdk = createSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'test-app-id',
    })
    console.log('Iframe SDK initialized successfully')
    return iframeSdk
  } catch (error) {
    console.error('Failed to initialize iframe SDK:', error)
    throw error
  }
}

// Function to get iframe context
export async function getIframeContext() {
  try {
    console.log('Getting iframe context...')
    
    const sdk = await getIframeSdk()
    const urlData = await sdk.getTopLevelUrlData()
    
    console.log('Iframe URL data received:', urlData)
    
    // Extract user context from the URL data
    // The experienceId is available directly from the URL data
    const experienceId = urlData.experienceId
    
    // For now, use the server API to get the full context since we need userId and companyId
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
  }
}

// Function to create in-app purchase using proper Whop iframe SDK
export async function createInAppPurchase(inAppPurchaseData: any) {
  try {
    console.log('Creating in-app purchase with data:', inAppPurchaseData)
    
    const sdk = await getIframeSdk()
    
    // Use the proper iframe SDK method for in-app purchases
    // The SDK expects { planId: string, id?: string }
    const result = await sdk.inAppPurchase({
      planId: inAppPurchaseData.planId,
      id: inAppPurchaseData.id
    })
    
    console.log('In-app purchase result:', result)
    
    if (result.status === 'ok') {
      return {
        success: true,
        receiptId: result.data.receipt_id,
        sessionId: result.data.session_id,
        chargeId: inAppPurchaseData.id,
        paymentUrl: null,
        paymentWindow: null
      }
    } else {
      return {
        success: false,
        error: result.error || 'In-app purchase failed',
        chargeId: inAppPurchaseData.id,
        sessionId: null,
        receiptId: null
      }
    }
  } catch (error) {
    console.error('Failed to create in-app purchase:', error)
    
    return {
      success: false,
      error: `Failed to create in-app purchase: ${error instanceof Error ? error.message : 'Unknown error'}`,
      chargeId: inAppPurchaseData?.id,
      sessionId: null,
      receiptId: null
    }
  }
}

// Note: openPurchaseModal is not available in the current @whop/iframe SDK
// Use createInAppPurchase instead for payment flows
