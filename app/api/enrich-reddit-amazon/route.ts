import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { isR2Image } from '@/lib/image-storage'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function POST() {
  // Check authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    // Lazy load dependencies to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    const { searchAmazonProduct } = await import('@/lib/amazon-search')
    
    // Find all Reddit-only products
    const redditProducts = await prisma.product.findMany({
      where: {
        OR: [
          { amazonUrl: null },
          { amazonUrl: { equals: '' } },
        ],
        trendSignals: {
          some: {
            source: 'reddit_skincare',
          },
        },
      },
      include: {
        trendSignals: true,
      },
    })

    let matched = 0
    let updated = 0
    let notFound = 0

    for (const product of redditProducts) {
      const amazonResult = await searchAmazonProduct(product.name)
      
      if (!amazonResult) {
        notFound++
        continue
      }

      // Check if this Amazon product already exists
      const existingAmazon = await prisma.product.findFirst({
        where: {
          amazonUrl: amazonResult.amazonUrl,
        },
        include: {
          trendSignals: true,
        },
      })

      if (existingAmazon && existingAmazon.id !== product.id) {
        // Merge Reddit signals into Amazon product
        const redditSignals = product.trendSignals.filter(s => s.source === 'reddit_skincare')
        
        for (const signal of redditSignals) {
          await prisma.trendSignal.update({
            where: { id: signal.id },
            data: { productId: existingAmazon.id },
          })
        }

        // Recalculate combined score
        const allSignals = await prisma.trendSignal.findMany({
          where: { productId: existingAmazon.id },
        })

        let amazonScore = 0
        for (const signal of allSignals) {
          if (signal.source === 'amazon_movers') {
            const metadata = signal.metadata as any
            const salesJump = signal.value || metadata?.salesJumpPercent || 0
            if (salesJump > 0) {
              amazonScore = Math.min(50, Math.floor(salesJump / 30))
            } else {
              amazonScore = 15
            }
            break
          }
        }

        const redditSignalsForScore = allSignals
          .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 2)
        const redditScore = Math.min(50, redditSignalsForScore.length * 25)
        const totalScore = amazonScore + redditScore

        await prisma.product.update({
          where: { id: existingAmazon.id },
          data: {
            trendScore: Math.max(existingAmazon.trendScore, totalScore),
            status: totalScore >= 60 ? 'FLAGGED' : existingAmazon.status,
          },
        })

        await prisma.product.delete({ where: { id: product.id } })
        matched++
      } else {
        // Check if product already has an R2 image (don't overwrite)
        const hasR2Image = isR2Image(product.imageUrl)
        
        // Only use Amazon image if product doesn't have an R2 image
        // Never overwrite R2 images with Amazon URLs (even placeholders)
        const imageUrl = hasR2Image 
          ? product.imageUrl 
          : (product.imageUrl || amazonResult.imageUrl)
        
        // Update Reddit product with Amazon data
        await prisma.product.update({
          where: { id: product.id },
          data: {
            amazonUrl: amazonResult.amazonUrl,
            price: product.price || amazonResult.price,
            imageUrl: imageUrl,
            brand: product.brand || amazonResult.brand,
          },
        })
        updated++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      message: `Enriched ${redditProducts.length} products: ${matched} matched, ${updated} updated, ${notFound} not found`,
    })
  } catch (error) {
    console.error('Error enriching Reddit with Amazon:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to enrich products' },
      { status: 500 }
    )
  }
}

