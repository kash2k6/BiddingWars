import { NextRequest, NextResponse } from 'next/server'
import { WhopServerSdk } from '@whop/api'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from headers or query params
    const whopUserToken = request.headers.get('x-whop-user-token')
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('Fetching user info for:', userId)

    // Initialize Whop SDK
    const whopSdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      appApiKey: process.env.WHOP_API_KEY!,
      onBehalfOfUserId: userId
    })

    // Fetch user information
    const user = await whopSdk.users.getUser({ userId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('User info fetched:', {
      id: user.id,
      username: user.username,
      email: user.email
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })

  } catch (error) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user info', details: error },
      { status: 500 }
    )
  }
}
