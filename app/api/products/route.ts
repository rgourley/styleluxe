import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'
// Cache API responses for 30 seconds
export const revalidate = 30

export async function GET(request: Request) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // FLAGGED, DRAFT, PUBLISHED
    const source = searchParams.get('source') // COMBINED, AMAZON_ONLY, REDDIT_ONLY
    const limit = parseInt(searchParams.get('limit') || '50')
    const daysAgo = parseInt(searchParams.get('days') || '90') // Only show products from last N days (increased to 90 to catch more products)
    const search = searchParams.get('search') // Search by product name

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Filter for recent products only (products with trend signals in last N days)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    // Build where clause
    const whereClause: any = {
      ...where,
    }

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ]
    } else {
      // Only include products that have recent trend signals (unless searching)
      whereClause.trendSignals = {
        some: {
          detectedAt: {
            gte: cutoffDate,
          },
        },
      }
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        trendSignals: {
          where: search ? undefined : {
            detectedAt: {
              gte: cutoffDate, // Only include recent signals when not searching
            },
          },
          orderBy: {
            detectedAt: 'desc',
          },
          take: 5,
        },
        content: true,
      },
      orderBy: {
        updatedAt: 'desc', // Sort by last imported/updated (most recent first)
      },
      take: limit,
    })

    // Recalculate trend scores using new system (Amazon 0-70 + Reddit bonus 0-30 = max 100)
    const productsWithRecalculatedScores = products.map(product => {
      let amazonScore = 0
      let redditScore = 0
      
      // Calculate Amazon score (70 points max)
      // Percentage ÷ 20 = points (capped at 70)
      // Minimum 10 points for being on Movers & Shakers
      const amazonSignals = product.trendSignals.filter(s => s.source === 'amazon_movers')
      for (const signal of amazonSignals) {
        const metadata = signal.metadata as any
        const salesJump = signal.value || metadata?.salesJumpPercent || 0
        if (salesJump > 0) {
          const calculatedScore = Math.min(70, Math.floor(salesJump / 20))
          // Give at least 10 points for being on Movers & Shakers, even with low percentages
          amazonScore = Math.max(10, calculatedScore)
          break // Use highest Amazon score
        } else {
          // Base score for being on Movers & Shakers (no specific % captured)
          amazonScore = 10
        }
      }
      
      // Calculate Reddit bonus score (30 points max)
      // Post with >500 upvotes = +20 points
      // Post with 300-500 upvotes = +15 points
      // Multiple posts = +10 points
      const redditSignals = product.trendSignals
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
      
      // Bonus for multiple mentions
      if (redditSignals.length >= 3) {
        redditScore += 10
      } else if (redditSignals.length >= 2) {
        redditScore += 5
      }
      
      redditScore = Math.min(30, redditScore) // Cap at 30
      
      // Total score = Amazon (0-70) + Reddit bonus (0-30) = max 100
      const totalScore = amazonScore + redditScore
      
      const hasAmazon = amazonSignals.length > 0
      const hasReddit = redditSignals.length > 0
      const sourceType = hasAmazon && hasReddit ? 'COMBINED' : hasAmazon ? 'AMAZON_ONLY' : hasReddit ? 'REDDIT_ONLY' : 'NONE'
      
      return {
        ...product,
        // Don't overwrite trendScore - use the database value (currentScore is the authoritative score)
        // Only add the recalculated score as metadata for reference
        _recalculatedScore: totalScore,
        _scoreBreakdown: {
          amazon: amazonScore,
          reddit: redditScore,
          total: totalScore,
        },
        _sourceType: sourceType,
      }
    })

    // Filter by source type if specified
    let filteredProducts = productsWithRecalculatedScores
    if (source && source !== 'ALL') {
      filteredProducts = productsWithRecalculatedScores.filter(p => p._sourceType === source)
    }

    // Sort by last updated (most recently imported/updated first)
    filteredProducts.sort((a, b) => {
      const aDate = new Date(a.updatedAt).getTime()
      const bDate = new Date(b.updatedAt).getTime()
      return bDate - aDate // Most recent first
    })

    return NextResponse.json({ success: true, products: filteredProducts })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

