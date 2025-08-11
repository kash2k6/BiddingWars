import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get user ID directly from JWT token in headers
    const headers = request.headers
    const userToken = headers.get('x-whop-user-token')
    
    if (!userToken) {
      return NextResponse.json({ error: 'Unauthorized - No user token found' }, { status: 401 })
    }
    
    let userId: string
    
    // Extract user ID from JWT token
    try {
      // The JWT token is in the format: header.payload.signature
      const parts = userToken.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }
      
      // Decode the payload (second part)
      const payloadBase64 = parts[1]
      // Add padding if needed
      const paddedPayload = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4)
      const payload = JSON.parse(Buffer.from(paddedPayload, 'base64').toString())
      
      userId = payload.sub
      console.log('Extracted user ID from JWT:', userId)
    } catch (error) {
      console.error('Failed to parse JWT:', error)
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 })
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${userId}/auction-images/${timestamp}.${fileExtension}`

    console.log('Attempting to upload file:', fileName, 'Size:', file.size, 'Type:', file.type)

    // Upload to Supabase Storage
    const { data, error } = await supabaseServer.storage
      .from('auction-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: error.message,
        bucket: 'auction-images',
        fileName: fileName
      }, { status: 500 })
    }

    console.log('File uploaded successfully:', data)

    // Get the public URL
    const { data: urlData } = supabaseServer.storage
      .from('auction-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
