import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, experienceId, title, content } = body
    
    if (!userId || !experienceId || !title || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, experienceId, title, content' 
      }, { status: 400 })
    }

    console.log('Testing notification with:', { userId, experienceId, title, content })
    
    const result = await sendPushNotification(
      userId,
      title,
      content,
      experienceId,
      '/test-notification'
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully',
      result 
    })
  } catch (error) {
    console.error('Test notification failed:', error)
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
