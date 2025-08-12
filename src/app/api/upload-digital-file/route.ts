import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get user context
    const userContext = await getWhopUserFromRequest(request)
    if (!userContext || !userContext.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const auctionId = formData.get('auctionId') as string
    const experienceId = formData.get('experienceId') as string

    if (!file || !auctionId || !experienceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user is the seller of this auction
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('created_by_user_id, type, status')
      .eq('id', auctionId)
      .eq('experience_id', experienceId)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.created_by_user_id !== userContext.userId) {
      return NextResponse.json({ error: 'Only the seller can upload files' }, { status: 403 })
    }

    if (auction.type !== 'DIGITAL') {
      return NextResponse.json({ error: 'Only digital auctions can have file uploads' }, { status: 400 })
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop()
    const fileName = `${auctionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
    const filePath = `digital-assets/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('digital-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Update auction with file path
    const { error: updateError } = await supabaseServer
      .from('auctions')
      .update({
        digital_file_path: filePath,
        digital_delivery_type: 'FILE'
      })
      .eq('id', auctionId)

    if (updateError) {
      console.error('Error updating auction:', updateError)
      return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      filePath: filePath,
      fileName: file.name
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
