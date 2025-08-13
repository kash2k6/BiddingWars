import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    
    if (!companyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing companyId parameter' 
      }, { status: 400 })
    }
    
    console.log('💰 Getting transfer fee for company:', companyId)
    
    // Get the company's ledger account
    const ledgerAccount = await whopSdk.companies.getCompanyLedgerAccount({ companyId })
    
    if (!ledgerAccount?.ledgerAccount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not find ledger account for company' 
      }, { status: 404 })
    }

    const transferFee = ledgerAccount.ledgerAccount.transferFee || 0
    const transferFeeDollars = transferFee / 100

    console.log('✅ Transfer fee found:', transferFee, 'cents ($' + transferFeeDollars + ')')
    
    return NextResponse.json({
      success: true,
      transferFee: {
        cents: transferFee,
        dollars: transferFeeDollars
      },
      ledgerAccount: {
        id: ledgerAccount.ledgerAccount.id,
        balanceCaches: ledgerAccount.ledgerAccount.balanceCaches
      }
    })

  } catch (error) {
    console.error('❌ Failed to get transfer fee:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
