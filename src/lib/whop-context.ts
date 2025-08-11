// Function to get Whop context from headers or URL params
export async function getWhopContext(): Promise<{
  userId: string
  experienceId: string
  companyId?: string
}> {
  if (typeof window === 'undefined') {
    throw new Error('getWhopContext must be called in browser environment')
  }

  console.log('Getting Whop context...')
  console.log('Current URL:', window.location.href)
  console.log('URL params:', window.location.search)
  console.log('Document referrer:', document.referrer)
  console.log('Window parent:', window.parent === window ? 'Same window' : 'Different window')

  // Try API route first (this will check headers and URL params)
  try {
    console.log('Trying API route...')
    const response = await fetch('/api/whop-context')
    console.log('API response status:', response.status)
    if (response.ok) {
      const context = await response.json()
      console.log('Got context from API route:', context)
      return context
    } else {
      const errorText = await response.text()
      console.log('API route failed with error:', errorText)
    }
  } catch (error) {
    console.log('API route error:', error)
  }

  // Try URL parameters as fallback
  const urlParams = new URLSearchParams(window.location.search)
  
  // Check for various possible parameter names that Whop might use
  const userId = urlParams.get('userId') || 
                 urlParams.get('user_id') || 
                 urlParams.get('whop-user-id') ||
                 urlParams.get('user')
  
  const experienceId = urlParams.get('experienceId') || 
                       urlParams.get('experience_id') || 
                       urlParams.get('whop-experience-id') ||
                       urlParams.get('experience')
  
  const companyId = urlParams.get('companyId') || 
                    urlParams.get('company_id') || 
                    urlParams.get('whop-company-id') ||
                    urlParams.get('company')

  if (userId && experienceId) {
    console.log('Using context from URL params:', { userId, experienceId, companyId })
    return {
      userId,
      experienceId,
      companyId: companyId || undefined
    }
  }

  // Try localStorage fallback (for development)
  const storedContext = localStorage.getItem('whop-context')
  if (storedContext) {
    try {
      const parsed = JSON.parse(storedContext)
      console.log('Using stored context from localStorage:', parsed)
      return parsed
    } catch (e) {
      console.log('Failed to parse stored context')
    }
  }

  // Auto-set context for development if not in iframe
  if (window.parent === window && process.env.NODE_ENV === 'development') {
    console.log('Auto-setting development context')
    const devContext = {
      userId: "user_ojPhs9dIhFQ9C",
      experienceId: "exp_hxtkjfMPOH3rWW",
      companyId: undefined
    }
    localStorage.setItem('whop-context', JSON.stringify(devContext))
    return devContext
  }

  // Try iframe SDK as last resort
  try {
    const { getIframeContext } = await import('./whop-iframe')
    const context = await getIframeContext()
    console.log('Got context from iframe SDK:', context)
    return context
  } catch (error) {
    console.error('Failed to get context from iframe SDK:', error)
    throw new Error('Unable to get Whop context from any source')
  }
}

// Function to set context for development
export function setWhopContext(context: {
  userId: string
  experienceId: string
  companyId?: string
}) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    localStorage.setItem('whop-context', JSON.stringify(context))
    console.log('Context set in localStorage:', context)
  }
}
