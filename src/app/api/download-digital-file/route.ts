import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get user context
    const userContext = await getWhopUserFromRequest(request)
    if (!userContext.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get file path from query params
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath')

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    // Verify user is the winner of the auction that contains this file
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('winner_user_id, digital_file_path')
      .eq('digital_file_path', filePath)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if user is the winner
    if (auction.winner_user_id !== userContext.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Download file from Supabase Storage
    const { data, error } = await supabaseServer.storage
      .from('digital-assets')
      .download(filePath)

    if (error) {
      console.error('Storage download error:', error)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Return file as blob
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
      },
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
