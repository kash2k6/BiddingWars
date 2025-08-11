import { NextRequest, NextResponse } from 'next/server'
import { WhopServerSdk } from '@whop/api'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/whop/ledger-account called')
    
    const { userId, companyId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Fetching ledger account for user:', userId, 'company:', companyId)

    // Initialize Whop SDK with the user ID we're acting on behalf of
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
      onBehalfOfUserId: userId
    })

    try {
      // Get user's ledger account from Whop API using the correct method
      const result = await whopSdk.users.getUserLedgerAccount()

      console.log('Whop ledger account result:', result)

      if (!result || !result.user) {
        console.log('No user found, returning empty balance')
        return NextResponse.json({
          user: {
            ledgerAccount: {
              balanceCaches: {
                nodes: [
                  {
                    currency: 'usd',
                    balance: 0,
                    pendingBalance: 0
                  }
                ]
              }
            }
          }
        })
      }

      // Return the actual ledger account data from Whop
      console.log('User ledger account found, returning real data')
      return NextResponse.json(result)
    } catch (whopError) {
      console.error('Error fetching from Whop API:', whopError)
      
      // Fallback to empty balance if Whop API fails
      return NextResponse.json({
        user: {
          ledgerAccount: {
            balanceCaches: {
              nodes: [
                {
                  currency: 'usd',
                  balance: 0,
                  pendingBalance: 0
                }
              ]
            }
          }
        }
      })
    }
  } catch (error) {
    console.error('Error in POST /api/whop/ledger-account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
