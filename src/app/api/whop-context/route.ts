import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    console.log('All request headers:', allHeaders)
    
    // Get Whop context from headers
    const whopUserToken = request.headers.get('x-whop-user-token')
    const whopExperienceId = request.headers.get('x-whop-experience-id')
    const whopCompanyId = request.headers.get('x-whop-company-id')
    
    console.log('Whop headers:', {
      'x-whop-user-token': whopUserToken,
      'x-whop-experience-id': whopExperienceId,
      'x-whop-company-id': whopCompanyId
    })

    // Also check URL parameters as fallback
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || 
                   url.searchParams.get('user_id') || 
                   url.searchParams.get('whop-user-id')
    const experienceId = url.searchParams.get('experienceId') || 
                         url.searchParams.get('experience_id') || 
                         url.searchParams.get('whop-experience-id')
    const companyId = url.searchParams.get('companyId') || 
                      url.searchParams.get('company_id') || 
                      url.searchParams.get('whop-company-id')

    console.log('URL params:', { userId, experienceId, companyId })

    // Try to extract experience ID from referrer if not in headers
    let extractedExperienceId = whopExperienceId || experienceId
    if (!extractedExperienceId && request.headers.get('referer')) {
      try {
        const refererUrl = new URL(request.headers.get('referer')!)
        const pathParts = refererUrl.pathname.split('/')
        const experienceIndex = pathParts.findIndex(part => part === 'experiences')
        if (experienceIndex !== -1 && pathParts[experienceIndex + 1]) {
          extractedExperienceId = pathParts[experienceIndex + 1]
          console.log('Extracted experience ID from referrer:', extractedExperienceId)
        }
      } catch (error) {
        console.log('Failed to parse referrer URL:', error)
      }
    }

    // Use headers first, then fallback to URL params, then referrer
    const context = {
      userId: whopUserToken || userId,
      experienceId: extractedExperienceId,
      companyId: whopCompanyId || companyId || undefined
    }

    if (!context.userId || !context.experienceId) {
      return NextResponse.json(
        { error: 'Missing required Whop context' },
        { status: 400 }
      )
    }

    console.log('Returning context:', context)
    return NextResponse.json(context)
  } catch (error) {
    console.error('Error getting Whop context:', error)
    return NextResponse.json(
      { error: 'Failed to get Whop context' },
      { status: 500 }
    )
  }
}
