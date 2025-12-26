import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Track a page view for a product
 * POST /api/track-view
 * Body: { productId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    // Increment page view count and update last viewed timestamp
    await prisma.product.update({
      where: { id: productId },
      data: {
        pageViews: {
          increment: 1,
        },
        lastViewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking page view:', error)
    return NextResponse.json(
      { error: 'Failed to track page view' },
      { status: 500 }
    )
  }
}

