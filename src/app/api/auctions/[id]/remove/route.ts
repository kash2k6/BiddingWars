import { NextRequest, NextResponse } from 'next/server'
import { removeAuctionFromMarketplace } from '@/lib/barracks-management'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, experienceId } = await request.json()

    console.log('Removing auction from marketplace:', { auctionId: params.id, userId, experienceId })

    await removeAuctionFromMarketplace(params.id)

    console.log('Auction removed from marketplace:', params.id)

    return NextResponse.json({
      success: true,
      message: 'Auction removed from marketplace'
    })

  } catch (error) {
    console.error('Error removing auction from marketplace:', error)
    return NextResponse.json({ 
      error: 'Failed to remove auction from marketplace',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
