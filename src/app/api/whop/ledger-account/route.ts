import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/whop/ledger-account called')
    
    const { userId, companyId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Fetching ledger account for user:', userId, 'company:', companyId)

    // For now, return mock data with a realistic structure
    // In production, this would call the actual Whop API
    const mockLedgerAccount = {
      user: {
        ledgerAccount: {
          balanceCaches: {
            nodes: [
              {
                currency: 'usd',
                balance: 5000, // $50.00
                pendingBalance: 0
              }
            ]
          }
        }
      }
    }

    console.log('Returning mock ledger account data')
    return NextResponse.json(mockLedgerAccount)
  } catch (error) {
    console.error('Error in POST /api/whop/ledger-account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
