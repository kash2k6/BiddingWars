import { NextRequest } from 'next/server'
import { whopSdk } from './whop'

export interface WhopContext {
  userId: string
  experienceId: string
  companyId?: string
}

export async function getWhopUserFromRequest(req: NextRequest): Promise<WhopContext | null> {
  try {
    // Extract user token from headers
    const userToken = req.headers.get('x-whop-user-token')
    const experienceId = req.headers.get('x-whop-experience-id')
    const companyId = req.headers.get('x-whop-company-id')

    // If we have the required headers, extract user ID from JWT
    if (userToken && experienceId) {
      let userId = userToken
      
      // If it's a JWT token, extract the user ID
      if (userToken.includes('.')) {
        try {
          const payload = JSON.parse(Buffer.from(userToken.split('.')[1], 'base64').toString())
          userId = payload.sub
        } catch (error) {
          console.log('Failed to parse JWT, using as-is:', userToken)
        }
      }

      return {
        userId,
        experienceId,
        companyId: companyId || undefined,
      }
    }

    // Fallback: Try to get context from the request body or URL
    // Note: We can't read the body here as it will be consumed
    // The calling function should pass the context separately

    return null
  } catch (error) {
    console.error('Error extracting Whop user:', error)
    return null
  }
}

export async function verifyWhopUser(userId: string): Promise<boolean> {
  try {
    // Verify user exists and has access
    const user = await whopSdk.users.getUser({ userId })
    return !!user
  } catch (error) {
    console.error('Error verifying Whop user:', error)
    return false
  }
}
