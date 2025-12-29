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

    // If no history, return empty array
    if (history.length === 0) {
      return NextResponse.json({ scores: [] })
    }

    // Extract scores
    const scores = history.map(h => h.currentScore)

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Error fetching sparkline data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sparkline data' },
      { status: 500 }
    )
  }
}

