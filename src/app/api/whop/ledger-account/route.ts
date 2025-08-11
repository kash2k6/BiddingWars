import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/whop/ledger-account called')
    
    // Temporarily return mock data to fix deployment
    return NextResponse.json({
      id: 'mock_ledger_id',
      balance: 10000, // $100.00 in cents
      currency: 'USD',
      userId: 'mock_user_id',
      companyId: 'mock_company_id'
    })
  } catch (error) {
    console.error('Error in POST /api/whop/ledger-account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
