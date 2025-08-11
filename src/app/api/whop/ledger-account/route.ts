import { NextRequest, NextResponse } from 'next/server'
import { createWhopClient } from '@/lib/whop'

export async function POST(request: NextRequest) {
  try {
    const { userId, companyId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Extract actual user ID from JWT token if needed
    let actualUserId = userId
    if (userId.includes('.')) {
      try {
        // This looks like a JWT token, extract the user ID from the payload
        const payload = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString())
        actualUserId = payload.sub
        console.log('Extracted user ID from JWT:', actualUserId)
      } catch (error) {
        console.log('Failed to parse JWT, using as-is:', userId)
      }
    }

    console.log('Fetching ledger account for user:', actualUserId, 'company:', companyId)

    // Create a Whop SDK instance for the specific user
    const userSdk = createWhopClient(actualUserId, companyId)
    
    // Try to get the specific user's ledger account
    try {
      const ledgerResult = await userSdk.users.getUserLedgerAccount({
        userId: actualUserId as string,
        companyId
      })
      console.log('User ledger account result:', JSON.stringify(ledgerResult, null, 2))
      return NextResponse.json(ledgerResult)
    } catch (ledgerError) {
      console.log('Error getting user ledger account:', ledgerError)
      
      // Fallback: Try to get the specific user directly
      try {
        const userResult = await userSdk.users.getUser({
          userId: actualUserId
        })
        console.log('User result:', JSON.stringify(userResult, null, 2))
        return NextResponse.json(userResult)
      } catch (userError) {
        console.log('Error getting user:', userError)
        
        // Last resort: Try getCurrentUser with the user-specific SDK
        try {
          const currentUserResult = await userSdk.users.getCurrentUser()
          console.log('Current user result (fallback):', JSON.stringify(currentUserResult, null, 2))
          return NextResponse.json(currentUserResult)
        } catch (currentUserError) {
          console.log('Error getting current user:', currentUserError)
          return NextResponse.json(
            { error: 'Failed to get user balance' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json(balanceData || { error: 'No balance data found' })
  } catch (error) {
    console.error('Error fetching ledger account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ledger account' },
      { status: 500 }
    )
  }
}
