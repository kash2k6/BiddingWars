import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'

export async function POST(request: NextRequest) {
  try {
    const { 
      recipientUserId, 
      amount, 
      currency = 'usd', 
      reason = 'Manual payout',
      experienceId,
      notes 
    } = await request.json()

    if (!recipientUserId || !amount || !experienceId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: recipientUserId, amount, experienceId' 
      }, { status: 400 })
    }

    console.log('💰 Processing manual payout:', {
      recipientUserId,
      amount,
      currency,
      reason,
      experienceId,
      notes
    })



    // Get the experience to find the company ID
    const experience = await whopSdk.experiences.getExperience({ experienceId })
    const companyId = experience.company.id

    console.log('Found company ID:', companyId)

    // Get the company's ledger account
    const ledgerAccount = await whopSdk.companies.getCompanyLedgerAccount({ companyId })
    const ledgerAccountId = ledgerAccount?.ledgerAccount?.id

    if (!ledgerAccountId) {
      throw new Error('Could not find ledger account for company')
    }

    const transferFee = ledgerAccount?.ledgerAccount?.transferFee || 0
    const totalCost = amount + (transferFee / 100) // transferFee is in cents

    console.log('Found ledger account:', ledgerAccountId)
    console.log('Transfer fee:', transferFee, 'cents ($' + (transferFee / 100) + ')')
    console.log('Total cost (amount + fee):', totalCost)

    // Execute the payout - try sending amount in dollars directly
    console.log('💰 Payout details:')
    console.log('  - Amount in dollars:', amount)
    console.log('  - Transfer fee in cents:', transferFee)
    console.log('  - Total cost in dollars:', totalCost)
    
    const payoutResult = await whopSdk.payments.payUser({
      amount: amount, // Send amount in dollars directly
      currency: currency as any,
      destinationId: recipientUserId,
      ledgerAccountId: ledgerAccountId,
      idempotenceKey: `manual_payout_${recipientUserId}_${Date.now()}`,
      reason: 'creator_to_creator' as any,
      notes: notes || reason,
      transferFee: transferFee
    })

    console.log('✅ Manual payout successful:', payoutResult)

    return NextResponse.json({
      success: true,
      message: `Successfully paid $${amount} to ${recipientUserId}`,
      payout: payoutResult
    })

  } catch (error) {
    console.error('❌ Manual payout failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
