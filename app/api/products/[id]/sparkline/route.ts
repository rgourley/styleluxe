import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Calculate a trend score for a given day based on trend signals
 * This reflects whether the product was on "selling out fast" and the sales spike
 */
function calculateDayScore(signals: any[]): number {
  let score = 0
  
  // Check for Amazon Movers & Shakers signals (sales spike)
  const amazonSignals = signals.filter(s => s.source === 'amazon_movers')
  for (const signal of amazonSignals) {
    const metadata = signal.metadata as any
    const salesJump = signal.value || metadata?.salesJumpPercent || 0
    if (salesJump > 0) {
      // Convert sales spike % to score (0-70 range)
      score = Math.min(70, Math.floor(salesJump / 20))
      score = Math.max(10, score) // Minimum 10 for being on M&S
      break
    } else {
      // On M&S but no specific % - give base score
      score = Math.max(score, 10)
    }
  }
  
  // Add Reddit bonus (0-30 range)
  const redditSignals = signals
    .filter(s => s.source === 'reddit_skincare')
    .sort((a, b) => (b.value || 0) - (a.value || 0))
  
  let highEngagementCount = 0
  for (const signal of redditSignals) {
    const upvotes = signal.value || 0
    if (upvotes > 500 && highEngagementCount < 2) {
      score += 20
      highEngagementCount++
    } else if (upvotes >= 300 && highEngagementCount < 2) {
      score += 15
      highEngagementCount++
    }
  }
  
  // Cap at 100
  return Math.min(100, score)
}

/**
 * Add small variance to scores to make sparklines more visually interesting
 * Uses a deterministic seed based on product ID and date to ensure consistency
 */
function addVariance(score: number, productId: string, date: Date): number {
  // Create a simple hash from productId and date for deterministic "randomness"
  const seed = `${productId}-${date.toISOString().split('T')[0]}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Generate variance between -2 and +2 points
  const variance = (hash % 5) - 2 // Range: -2 to +2
  
  // Apply variance but keep within 0-100 bounds
  return Math.max(0, Math.min(100, score + variance))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get last 7 days of trend signals to show actual trend changes
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    // Get all trend signals from the last 7 days
    const signals = await prisma.trendSignal.findMany({
      where: {
        productId: id,
        detectedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        detectedAt: 'asc',
      },
    })

    // Get current product state
    const product = await prisma.product.findUnique({
      where: { id },
      select: { 
        baseScore: true, 
        currentScore: true,
        onMoversShakers: true,
        trendSignals: {
          where: {
            source: 'amazon_movers',
          },
          orderBy: {
            detectedAt: 'desc',
          },
          take: 1,
        },
      },
    })

    // Build daily scores for the last 7 days
    const scores: number[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      
      const nextDay = new Date(day)
      nextDay.setDate(nextDay.getDate() + 1)
      
      // Get signals for this specific day
      const daySignals = signals.filter(s => {
        const signalDate = new Date(s.detectedAt)
        signalDate.setHours(0, 0, 0, 0)
        return signalDate.getTime() === day.getTime()
      })
      
      // Calculate score for this day
      let dayScore: number
      if (daySignals.length > 0) {
        // Use signals from this day
        dayScore = calculateDayScore(daySignals)
      } else if (i === 0 && product) {
        // Today - use current product state
        if (product.baseScore !== null) {
          dayScore = product.baseScore
        } else if (product.trendSignals.length > 0) {
          // Calculate from current signals
          dayScore = calculateDayScore(product.trendSignals)
        } else {
          // No signals today - use previous day's score or 0
          dayScore = scores.length > 0 ? scores[scores.length - 1] : 0
        }
      } else {
        // No signals for this day - use previous day's score or 0
        dayScore = scores.length > 0 ? scores[scores.length - 1] : 0
      }
      
      // Add small variance to make the line more interesting (not straight)
      const scoreWithVariance = addVariance(dayScore, id, day)
      scores.push(scoreWithVariance)
    }

    // If we have no scores, try to use current baseScore as fallback
    if (scores.length === 0 || scores.every(s => s === 0)) {
      if (product?.baseScore !== null) {
        const currentScore = addVariance(product.baseScore, id, today)
        return NextResponse.json({ scores: [currentScore] })
      } else if (product?.currentScore !== null) {
        const currentScore = addVariance(product.currentScore, id, today)
        return NextResponse.json({ scores: [currentScore] })
      }
    }

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Error fetching sparkline data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sparkline data' },
      { status: 500 }
    )
  }
}

