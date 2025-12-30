import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get last 7 days of score history
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const history = await prisma.productScoreHistory.findMany({
      where: {
        productId: id,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        recordedAt: 'asc',
      },
      take: 7,
    })

    // Get current product score to include as the most recent point
    const product = await prisma.product.findUnique({
      where: { id },
      select: { currentScore: true },
    })

    // Extract scores from history
    const historicalScores = history.map(h => h.currentScore)

    // If we have history, append current score as the last point (most recent)
    // This ensures the sparkline always ends at the current score
    if (historicalScores.length > 0 && product && product.currentScore !== null) {
      // Only add current score if it's different from the last historical point
      // or if we want to always show the most up-to-date value
      const lastHistoricalScore = historicalScores[historicalScores.length - 1]
      if (product.currentScore !== lastHistoricalScore) {
        historicalScores.push(product.currentScore)
      }
    } else if (historicalScores.length === 0 && product && product.currentScore !== null) {
      // If no history but we have a current score, return just that
      return NextResponse.json({ scores: [product.currentScore] })
    }

    // If no history and no current score, return empty array
    if (historicalScores.length === 0) {
      return NextResponse.json({ scores: [] })
    }

    return NextResponse.json({ scores: historicalScores })
  } catch (error) {
    console.error('Error fetching sparkline data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sparkline data' },
      { status: 500 }
    )
  }
}

