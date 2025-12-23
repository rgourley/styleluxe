import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Merge a duplicate product into an existing product
 * POST /api/products/[duplicateId]/merge
 * Body: { targetProductId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duplicateId } = await params
    const body = await request.json()
    const { targetProductId } = body

    if (!targetProductId) {
      return NextResponse.json(
        { success: false, message: 'Target product ID is required' },
        { status: 400 }
      )
    }

    if (duplicateId === targetProductId) {
      return NextResponse.json(
        { success: false, message: 'Cannot merge product with itself' },
        { status: 400 }
      )
    }

    // Get both products
    const [duplicate, target] = await Promise.all([
      prisma.product.findUnique({
        where: { id: duplicateId },
        include: {
          trendSignals: true,
          reviews: true,
          content: true,
        },
      }),
      prisma.product.findUnique({
        where: { id: targetProductId },
      }),
    ])

    if (!duplicate) {
      return NextResponse.json(
        { success: false, message: 'Duplicate product not found' },
        { status: 404 }
      )
    }

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Target product not found' },
        { status: 404 }
      )
    }

    // Transfer trend signals
    await prisma.trendSignal.updateMany({
      where: { productId: duplicateId },
      data: { productId: targetProductId },
    })

    // Transfer reviews
    await prisma.review.updateMany({
      where: { productId: duplicateId },
      data: { productId: targetProductId },
    })

    // Update target product with best data from duplicate
    const updates: any = {}
    
    // Use better/more complete name
    if (duplicate.name.length > target.name.length) {
      updates.name = duplicate.name
    }
    
    // Fill in missing data
    if (!target.amazonUrl && duplicate.amazonUrl) {
      updates.amazonUrl = duplicate.amazonUrl
    }
    if (!target.imageUrl && duplicate.imageUrl) {
      updates.imageUrl = duplicate.imageUrl
    }
    if (!target.price && duplicate.price) {
      updates.price = duplicate.price
    }
    if (!target.brand && duplicate.brand) {
      updates.brand = duplicate.brand
    }
    
    // Update scores (keep highest)
    if (duplicate.trendScore > (target.trendScore || 0)) {
      updates.trendScore = duplicate.trendScore
    }
    if (duplicate.currentScore && (!target.currentScore || duplicate.currentScore > target.currentScore)) {
      updates.currentScore = duplicate.currentScore
    }
    if (duplicate.peakScore && (!target.peakScore || duplicate.peakScore > target.peakScore)) {
      updates.peakScore = duplicate.peakScore
    }
    if (duplicate.baseScore && (!target.baseScore || duplicate.baseScore > target.baseScore)) {
      updates.baseScore = duplicate.baseScore
    }

    // Update firstDetected if duplicate is older
    if (duplicate.firstDetected && (!target.firstDetected || duplicate.firstDetected < target.firstDetected)) {
      updates.firstDetected = duplicate.firstDetected
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: targetProductId },
        data: updates,
      })
    }

    // Delete duplicate product (cascades to content, metadata, questions)
    await prisma.product.delete({
      where: { id: duplicateId },
    })

    return NextResponse.json({
      success: true,
      message: `Product merged successfully. ${duplicate.trendSignals.length} signals and ${duplicate.reviews.length} reviews transferred.`,
    })
  } catch (error: any) {
    console.error('Error merging products:', error)
    
    // Ensure we always return JSON, even on errors
    try {
      return NextResponse.json(
        {
          success: false,
          message: error?.message || error?.toString() || 'Failed to merge products',
        },
        { status: 500 }
      )
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Failed to merge products',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

