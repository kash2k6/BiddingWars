import { whopSdk } from './whop'

export interface CompanyInfo {
  id: string
  name: string
  ownerId: string
  ownerUsername?: string
  ownerName?: string
}

/**
 * Get company information from Whop
 * This helps identify who is the community owner/admin
 */
export async function getCompanyInfo(companyId: string): Promise<CompanyInfo | null> {
  try {
    console.log('Fetching company info for:', companyId)
    
    // Use the Whop SDK to get company information
    const result = await whopSdk.companies.getCompany({
      id: companyId
    })

    if (!result?.company) {
      console.log('No company found for ID:', companyId)
      return null
    }

    const company = result.company
    
    return {
      id: company.id,
      name: company.name || 'Unknown Company',
      ownerId: company.owner?.id || '',
      ownerUsername: company.owner?.username,
      ownerName: company.owner?.name
    }
  } catch (error) {
    console.error('Error fetching company info:', error)
    return null
  }
}

/**
 * Check if a user is the owner of a company
 */
export async function isCompanyOwner(userId: string, companyId: string): Promise<boolean> {
  try {
    const companyInfo = await getCompanyInfo(companyId)
    
    if (!companyInfo) {
      return false
    }
    
    return companyInfo.ownerId === userId
  } catch (error) {
    console.error('Error checking company ownership:', error)
    return false
  }
}

/**
 * Get the current user's company information if they own one
 */
export async function getCurrentUserCompany(): Promise<CompanyInfo | null> {
  try {
    // Get current user
    const userResult = await whopSdk.users.getCurrentUser()
    
    if (!userResult?.user) {
      return null
    }
    
    const user = userResult.user
    
    // Get user's companies
    const companiesResult = await whopSdk.companies.listCompanies({
      first: 10
    })
    
    if (!companiesResult?.companies?.nodes) {
      return null
    }
    
    // Find companies where the user is the owner
    const ownedCompanies = companiesResult.companies.nodes.filter(
      (company: any) => company.owner?.id === user.id
    )
    
    if (ownedCompanies.length === 0) {
      return null
    }
    
    // Return the first owned company
    const company = ownedCompanies[0]
    return {
      id: company.id,
      name: company.name || 'Unknown Company',
      ownerId: company.owner?.id || '',
      ownerUsername: company.owner?.username,
      ownerName: company.owner?.name
    }
  } catch (error) {
    console.error('Error getting current user company:', error)
    return null
  }
}
