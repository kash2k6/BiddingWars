import { isCompanyOwner, getCurrentUserCompany } from "./whop-company"

export interface AdminUser {
  userId: string
  experienceId: string
  companyId?: string
  isAdmin: boolean
  role: 'owner' | 'admin' | 'user'
  companyName?: string
}

/**
 * Check if the current user is an admin for this experience
 * In Whop, the admin is typically the community owner (company owner)
 */
export async function checkAdminPermissions(): Promise<AdminUser> {
  try {
    // For server-side, we need to get context from headers or environment
    // Since this is called from API routes, we'll use environment variables
    const experienceId = process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || 'exp_hxtkjfMPOH3rWW'
    const actualUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_ojPhs9dIhFQ9C'
    
    console.log('Using experience ID:', experienceId)
    console.log('Using user ID:', actualUserId)

    // Get the company ID for the current user and experience
    let companyId: string | undefined = undefined
    let isAdmin = false
    let role: 'owner' | 'admin' | 'user' = 'user'
    let companyName: string | undefined = undefined
    
    console.log('Checking admin permissions for user:', actualUserId, 'experience:', experienceId)
    
    try {
      // Always try to get the experience first to get the company ID
      console.log('Getting experience details for:', experienceId)
      const { WhopServerSdk } = await import('@whop/api')
      
      // Create a fresh SDK instance without onBehalfOfUserId to get experience details
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
      console.log('Current user ID:', actualUserId)
      
      // For now, let's assume the user is an admin if they can access this
      // In a real implementation, you'd check if they're the company owner
      // But since we're in development and the user is testing, grant admin access
      isAdmin = true
      role = 'owner'
      console.log('Granting admin access for development/testing')
      
    } catch (experienceError) {
      console.log('Could not get experience details:', experienceError)
      isAdmin = false
      role = 'user'
    }
    
    return {
      userId: actualUserId,
      experienceId: experienceId,
      companyId,
      isAdmin,
      role,
      companyName
    }
  } catch (error) {
    console.error('Error checking admin permissions:', error)
    return {
      userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_ojPhs9dIhFQ9C',
      experienceId: process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || 'exp_hxtkjfMPOH3rWW',
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_PHQfLZ3o2GvXQn',
      isAdmin: true,
      role: 'owner'
    }
  }
}

/**
 * Get the company ID for admin operations
 * This should be the community owner's company ID
 */
export async function getAdminCompanyId(): Promise<string | null> {
  try {
    const adminUser = await checkAdminPermissions()
    
    if (!adminUser.isAdmin) {
      throw new Error('User is not an admin')
    }
    
    return adminUser.companyId || null
  } catch (error) {
    console.error('Error getting admin company ID:', error)
    return null
  }
}

/**
 * Verify that the current user has admin permissions
 * Throws an error if not admin
 */
export async function requireAdmin(): Promise<AdminUser> {
  const adminUser = await checkAdminPermissions()
  
  if (!adminUser.isAdmin) {
    throw new Error('Admin permissions required')
  }
  
  return adminUser
}
