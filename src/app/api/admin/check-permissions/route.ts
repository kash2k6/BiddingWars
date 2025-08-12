import { NextRequest, NextResponse } from 'next/server'
import { getWhopUserFromRequest } from '@/lib/auth'
import { WhopServerSdk } from '@whop/api'

export interface AdminUser {
  userId: string
  experienceId: string
  companyId?: string
  isAdmin: boolean
  role: 'owner' | 'admin' | 'user'
  companyName?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get user context from Whop iframe
    const userContext = await getWhopUserFromRequest(request)
    if (!userContext || !userContext.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { experienceId } = userContext
    const actualUserId = userContext.userId

    console.log('Checking admin permissions for user:', actualUserId, 'experience:', experienceId)

    let companyId: string | undefined = undefined
    let isAdmin = false
    let role: 'owner' | 'admin' | 'user' = 'user'
    let companyName: string | undefined = undefined

    try {
      // Get experience details to find the company
      const experienceSdk = WhopServerSdk({
        appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
        appApiKey: process.env.WHOP_API_KEY!,
      })

      const experience = await experienceSdk.experiences.getExperience({ 
        experienceId: experienceId 
      })

      console.log('Experience details:', experience)
      companyId = experience.company.id
      companyName = experience.company.title

      console.log('Company ID from experience:', companyId)
      console.log('Company name from experience:', companyName)

      // For now, grant admin access to the experience creator
      // In a real implementation, you'd check company ownership
      // For development/testing, grant admin access
      isAdmin = true
      role = 'owner'
      console.log('Granting admin access for development/testing')

    } catch (experienceError) {
      console.log('Could not get experience details:', experienceError)
      isAdmin = false
      role = 'user'
    }

    const adminUser: AdminUser = {
      userId: actualUserId,
      experienceId: experienceId,
      companyId,
      isAdmin,
      role,
      companyName
    }

    console.log('Admin check result:', adminUser)

    return NextResponse.json(adminUser)

  } catch (error) {
    console.error('Error checking admin permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
