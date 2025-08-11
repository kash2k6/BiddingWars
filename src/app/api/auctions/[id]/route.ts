import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET /api/auctions/[id] called for auction:', params.id)
    
    // Get user context from headers or URL params
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const experienceId = url.searchParams.get('experienceId')
    
    if (!userId || !experienceId) {
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
    
    // Fetch auction data
    const { data: auction, error } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', params.id)
      .eq('created_by_user_id', actualUserId)
      .eq('experience_id', experienceId)
      .single()

    if (error || !auction) {
      console.error('Error fetching auction:', error)
      return NextResponse.json({ error: 'Auction not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(auction)
  } catch (error) {
    console.error('Error in GET /api/auctions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('PUT /api/auctions/[id] called for auction:', params.id)
    
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

    if (buyNowPriceCents && buyNowPriceCents <= startPriceCents) {
      return NextResponse.json({ error: 'Buy now price must be greater than start price' }, { status: 400 })
    }

    // Validate community percentage
    if (communityPct < 0 || communityPct > 100) {
      return NextResponse.json({ error: 'Community percentage must be between 0 and 100' }, { status: 400 })
    }

    // Check if auction exists and user owns it
    const { data: existingAuction, error: fetchError } = await supabaseServer
      .from('auctions')
      .select('*')
      .eq('id', params.id)
      .eq('created_by_user_id', actualUserId)
      .eq('experience_id', experienceId)
      .single()

    if (fetchError || !existingAuction) {
      return NextResponse.json({ error: 'Auction not found or access denied' }, { status: 404 })
    }

    // Check if auction has any bids
    const { data: bids, error: bidsError } = await supabaseServer
      .from('bids')
      .select('id')
      .eq('auction_id', params.id)

    if (bidsError) {
      console.error('Error checking bids:', bidsError)
      return NextResponse.json({ error: 'Failed to check auction bids' }, { status: 500 })
    }

    if (bids && bids.length > 0) {
      return NextResponse.json({ error: 'Cannot edit auction that has bids' }, { status: 400 })
    }

    // Prepare digital product data
    const digitalData = type === 'DIGITAL' && digitalProduct ? {
      digital_delivery_type: digitalProduct.deliveryType,
      digital_file_path: digitalProduct.filePath,
      digital_discount_code: digitalProduct.discountCode,
      digital_download_link: digitalProduct.downloadLink,
      digital_instructions: digitalProduct.instructions,
    } : {}

    // Update auction
    const { data: auction, error } = await supabaseServer
      .from('auctions')
      .update({
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
        updated_at: new Date().toISOString(),
        ...digitalData,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating auction:', error)
      return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 })
    }

    return NextResponse.json(auction)
  } catch (error) {
    console.error('Error in PUT /api/auctions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
