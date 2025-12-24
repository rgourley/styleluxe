import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

function calculateScoreFromSignals(signals: any[]): number {
  let amazonScore = 0
  let redditScore = 0
  
  // Calculate Amazon score (70 points max)
  // Percentage ÷ 20 = points (capped at 70)
  // Minimum 10 points for being on Movers & Shakers
  const amazonSignals = signals.filter(s => s.source === 'amazon_movers')
  for (const signal of amazonSignals) {
    const metadata = signal.metadata as any
    const salesJump = signal.value || metadata?.salesJumpPercent || 0
    if (salesJump > 0) {
      const calculatedScore = Math.min(70, Math.floor(salesJump / 20))
      // Give at least 10 points for being on Movers & Shakers, even with low percentages
      amazonScore = Math.max(10, calculatedScore)
      break // Use highest Amazon score
    } else {
      amazonScore = 10 // Base score
    }
  }
  
  // Calculate Reddit bonus score (30 points max)
  // Post with >500 upvotes = +20 points
  // Post with 300-500 upvotes = +15 points
  // Multiple posts = +10 points
  const redditSignals = signals
    .filter(s => s.source === 'reddit_skincare')
    .sort((a, b) => (b.value || 0) - (a.value || 0))
  
  let highEngagementCount = 0
  for (const signal of redditSignals) {
    const upvotes = signal.value || 0
    if (upvotes > 500 && highEngagementCount < 2) {
      redditScore += 20
      highEngagementCount++
    } else if (upvotes >= 300 && highEngagementCount < 2) {
      redditScore += 15
      highEngagementCount++
    }
  }
  
  if (redditSignals.length >= 3) {
    redditScore += 10
  } else if (redditSignals.length >= 2) {
    redditScore += 5
  }
  
  redditScore = Math.min(30, redditScore) // Cap at 30
  
  // Total score = Amazon (0-70) + Reddit bonus (0-30) = max 100
  return amazonScore + redditScore
}

export async function POST() {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const products = await prisma.product.findMany({
      include: {
        trendSignals: true,
      },
    })

    let updated = 0

    for (const product of products) {
      if (product.trendSignals.length === 0) continue

      const calculatedScore = calculateScoreFromSignals(product.trendSignals)
      
      // Calculate individual scores for flagging logic
      const amazonSignals = product.trendSignals.filter((s: any) => s.source === 'amazon_movers')
      const redditSignals = product.trendSignals.filter((s: any) => s.source === 'reddit_skincare')
      
      let amazonScore = 0
      for (const signal of amazonSignals) {
        const metadata = signal.metadata as any
        const salesJump = signal.value || metadata?.salesJumpPercent || 0
        if (salesJump > 0) {
          const calculatedScore = Math.min(70, Math.floor(salesJump / 20))
          // Give at least 10 points for being on Movers & Shakers, even with low percentages
          amazonScore = Math.max(10, calculatedScore)
        } else {
          amazonScore = 10 // Base score
        }
        break
      }
      
      // Reddit bonus calculation
      let redditScore = 0
      const sortedReddit = redditSignals.sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
      let highEngagementCount = 0
      for (const signal of sortedReddit) {
        const upvotes = signal.value || 0
        if (upvotes > 500 && highEngagementCount < 2) {
          redditScore += 20
          highEngagementCount++
        } else if (upvotes >= 300 && highEngagementCount < 2) {
          redditScore += 15
          highEngagementCount++
        }
      }
      if (redditSignals.length >= 3) {
        redditScore += 10
      } else if (redditSignals.length >= 2) {
        redditScore += 5
      }
      redditScore = Math.min(30, redditScore)
      // Only flag if combined score >= 60 (requires BOTH Amazon + Reddit)
      const shouldFlag = calculatedScore >= 60
      
      if (calculatedScore !== product.trendScore || (shouldFlag && product.status !== 'FLAGGED' && product.status !== 'PUBLISHED')) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            trendScore: calculatedScore,
            status: shouldFlag && product.status !== 'PUBLISHED' ? 'FLAGGED' : product.status === 'FLAGGED' && !shouldFlag ? 'DRAFT' : product.status,
          },
        })
        updated++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updated} product scores` 
    })
  } catch (error) {
    console.error('Error fixing scores:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fix scores' },
      { status: 500 }
    )
  }
}

