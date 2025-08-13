import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get('experienceId')
    
    if (!experienceId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing experienceId parameter' 
      }, { status: 400 })
    }
    
    console.log('🔍 Getting community owner for experience:', experienceId)
    
    // Get the experience details
    const experience = await whopSdk.experiences.getExperience({ experienceId })
    
    console.log('✅ Experience found:', {
      id: experience.id,
      title: experience.title,
      companyId: experience.company.id,
      companyName: experience.company.title
    })
    
    return NextResponse.json({
      success: true,
      communityOwner: {
        experienceId: experience.id,
        experienceTitle: experience.title,
        companyId: experience.company.id,
        companyName: experience.company.title,
        // The community owner is the company owner
        ownerUserId: experience.company.owner?.id || null,
        ownerUsername: experience.company.owner?.username || null
      }
    })

  } catch (error) {
    console.error('❌ Failed to get community owner:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
