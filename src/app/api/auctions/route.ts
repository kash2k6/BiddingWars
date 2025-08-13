import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWhopUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/auctions called')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    // Extract user context from request body
    const { userId, experienceId, companyId, ...auctionData } = body
    
    if (!userId || !experienceId) {
      console.log('Missing userId or experienceId in request body')
      return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
    }
    
    // Extract actual user ID from JWT if needed
    let actualUserId = userId
    if (userId.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(userId.split('.')[1], 'base64').toString())
        actualUserId = payload.sub
        console.log('Extracted user ID from JWT:', actualUserId)
      } catch (error) {
        console.log('Failed to parse JWT, using as-is:', userId)
      }
    }
    
    const whopContext = {
      userId: actualUserId,
      experienceId,
      companyId: companyId || undefined,
    }
    console.log('Whop context:', whopContext)
    
    const {
      title,
      description,
      images,
      type,
      startsAt,
      endsAt,
      startPriceCents,
      minIncrementCents,
      buyNowPriceCents,
      communityPct,
      shippingCostCents = 0,
      digitalProduct,
    } = auctionData

    // Validate required fields
    if (!title || !description || !type || !startsAt || !endsAt || !startPriceCents || !minIncrementCents || communityPct === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate auction type
    if (!['DIGITAL', 'PHYSICAL'].includes(type)) {
      return NextResponse.json({ error: 'Invalid auction type' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)
    const now = new Date()

    // Allow auctions to start immediately or in the future
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Validate prices
    if (startPriceCents <= 0) {
      return NextResponse.json({ error: 'Start price must be greater than 0' }, { status: 400 })
    }

    if (minIncrementCents <= 0) {
      return NextResponse.json({ error: 'Minimum increment must be greater than 0' }, { status: 400 })
    }

    if (buyNowPriceCents && buyNowPriceCents > 0 && buyNowPriceCents <= startPriceCents) {
      return NextResponse.json({ 
        error: `Buy now price (${(buyNowPriceCents / 100).toFixed(2)}) must be greater than start price (${(startPriceCents / 100).toFixed(2)})` 
      }, { status: 400 })
    }

    // Validate community percentage
    if (communityPct < 0 || communityPct > 100) {
      return NextResponse.json({ error: 'Community percentage must be between 0 and 100' }, { status: 400 })
    }

    // Prepare digital product data
    const digitalData = type === 'DIGITAL' && digitalProduct ? {
      digital_delivery_type: digitalProduct.deliveryType,
      digital_file_path: digitalProduct.filePath,
      digital_discount_code: digitalProduct.discountCode,
      digital_download_link: digitalProduct.downloadLink,
      digital_instructions: digitalProduct.instructions,
    } : {}

    // Determine auction status based on start time
    const auctionStatus = startDate > now ? 'COMING_SOON' : 'LIVE' // Use COMING_SOON for future auctions

    // Create auction
    const { data: auction, error: insertError } = await supabaseServer
      .from('auctions')
      .insert({
        experience_id: whopContext.experienceId,
        created_by_user_id: whopContext.userId,
        title,
        description,
        images: images || [],
        type,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        start_price_cents: startPriceCents,
        min_increment_cents: minIncrementCents,
        buy_now_price_cents: buyNowPriceCents,
        community_pct: communityPct,
        shipping_cost_cents: shippingCostCents,
        status: auctionStatus, // Use calculated status instead of always LIVE
        ...digitalData,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating auction:', insertError)
      return NextResponse.json({ error: 'Failed to create auction' }, { status: 500 })
    }

    // Send new auction notification to community
    try {
      const { sendNewAuctionNotification } = await import('@/lib/notifications')
      
      await sendNewAuctionNotification(
        experienceId,
        auction.id,
        title,
        startPriceCents
      )
      
      console.log('New auction notification sent to community')
    } catch (notificationError) {
      console.error('Failed to send new auction notification:', notificationError)
      // Don't fail auction creation for notification errors
    }

    console.log('Auction created successfully:', auction.id)
    return NextResponse.json({ 
      success: true, 
      auction: {
        id: auction.id,
        title: auction.title,
        start_price_cents: auction.start_price_cents,
        status: auction.status
      }
    })
  } catch (error) {
    console.error('Error in POST /api/auctions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const whopContext = await getWhopUserFromRequest(request)
    if (!whopContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabaseServer
      .from('auctions')
      .select('*')
      .eq('experience_id', whopContext.experienceId)

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: auctions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching auctions:', error)
      return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
    }

    return NextResponse.json(auctions)
  } catch (error) {
    console.error('Error in GET /api/auctions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
