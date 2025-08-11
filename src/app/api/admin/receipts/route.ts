import { NextRequest, NextResponse } from 'next/server'
import { getCompanyReceipts } from '@/lib/payment-system'
import { requireAdmin } from '@/lib/admin-permissions'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/receipts called')
    
    // Check admin permissions
    const adminUser = await requireAdmin()
    console.log('Admin user verified:', adminUser.userId)
    
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }
    
    // Verify the company ID matches the admin's company
    if (!adminUser.companyId || companyId !== adminUser.companyId) {
      return NextResponse.json({ error: 'Unauthorized access to company data' }, { status: 403 })
    }

    // Get receipts for the company
    const result = await getCompanyReceipts(companyId, {
      first: 50,
      filter: {
        statuses: ['succeeded']
      }
    })

    // Transform the data for the frontend
    const receipts = result.receipts?.nodes?.map((receipt: any) => ({
      id: receipt.id,
      status: receipt.status,
      currency: receipt.currency,
      settledUsdAmount: receipt.settledUsdAmount,
      totalUsdAmount: receipt.totalUsdAmount,
      amountAfterFees: receipt.amountAfterFees,
      paidAt: receipt.paidAt,
      member: {
        user: {
          username: receipt.member?.user?.username,
          name: receipt.member?.user?.name
        }
      },
      metadata: receipt.metadata || {}
    })) || []

    return NextResponse.json({
      receipts,
      pageInfo: result.receipts?.pageInfo
    })

  } catch (error) {
    console.error('Error in GET /api/admin/receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
