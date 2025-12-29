import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeAmazonProductPage } from '@/lib/amazon-product-scraper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for cron jobs

/**
 * Cron job to update product ratings and review counts
 * 
 * Runs every 2 weeks via Vercel Cron
 * Updates:
 * - Star ratings
 * - Review counts
 * - Prices (if changed significantly)
 * 
 * Strategy:
 * - Prioritizes high-traffic/trending products (score > 70)
 * - Skips products updated in last 10 days
 * - Processes in batches with rate limiting
 */
export async function GET(request: Request) {
  // Verify this is a cron request (optional security)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('🔄 Starting product ratings update job...\n')

    // Get products that need updating
    // Priority: High score products first, then by last scraped date
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    // Get published products that haven't been updated recently
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        amazonUrl: {
          not: null,
        },
        OR: [
          {
            metadata: {
              lastScrapedAt: {
                lt: tenDaysAgo,
              },
            },
          },
          {
            metadata: null,
          },
        ],
      },
      include: {
        metadata: true,
      },
      orderBy: [
        {
          currentScore: 'desc', // High score products first
        },
        {
          trendScore: 'desc', // Fallback to trendScore
        },
        {
          metadata: {
            lastScrapedAt: 'asc', // Oldest first if same score
          },
        },
      ],
      take: 50, // Process 50 products per run (adjust based on rate limits)
    })

    console.log(`Found ${products.length} products to update\n`)

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products need updating',
        updated: 0,
      })
    }

    let updated = 0
    let failed = 0
    let skipped = 0
    const results: Array<{
      productId: string
      name: string
      status: 'updated' | 'failed' | 'skipped'
      changes?: {
        rating?: { old: number | null; new: number | null }
        reviewCount?: { old: number | null; new: number | null }
        price?: { old: number | null; new: number | null }
      }
    }> = []

    // Process products with rate limiting (1 request per 2 seconds to avoid Amazon blocks)
    for (let i = 0; i < products.length; i++) {
      const product = products[i]

      // Skip if no Amazon URL
      if (!product.amazonUrl) {
        skipped++
        results.push({
          productId: product.id,
          name: product.name,
          status: 'skipped',
        })
        continue
      }

      try {
        console.log(`[${i + 1}/${products.length}] Updating: ${product.name.substring(0, 50)}...`)

        // Scrape Amazon product page
        const productData = await scrapeAmazonProductPage(product.amazonUrl)

        if (!productData) {
          console.log(`  ❌ Failed to scrape`)
          failed++
          results.push({
            productId: product.id,
            name: product.name,
            status: 'failed',
          })
          
          // Wait before next attempt (rate limiting)
          if (i < products.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          continue
        }

        // Get current metadata
        const currentRating = product.metadata?.starRating || null
        const currentReviewCount = product.metadata?.totalReviewCount || null
        const currentPrice = product.price || null

        // Check if there are meaningful changes
        const ratingChanged = productData.starRating && 
          productData.starRating !== currentRating
        const reviewCountChanged = productData.totalReviewCount && 
          productData.totalReviewCount !== currentReviewCount
        const priceChanged = productData.price && 
          productData.price !== currentPrice &&
          Math.abs((productData.price - (currentPrice || 0)) / (currentPrice || 1)) > 0.05 // 5% change

        // Only update if there are changes
        if (ratingChanged || reviewCountChanged || priceChanged) {
          // Update or create metadata
          if (product.metadata) {
            await prisma.productMetadata.update({
              where: { productId: product.id },
              data: {
                starRating: productData.starRating || product.metadata.starRating,
                totalReviewCount: productData.totalReviewCount || product.metadata.totalReviewCount,
                lastScrapedAt: new Date(),
              },
            })
          } else {
            await prisma.productMetadata.create({
              data: {
                productId: product.id,
                starRating: productData.starRating || null,
                totalReviewCount: productData.totalReviewCount || null,
                lastScrapedAt: new Date(),
              },
            })
          }

          // Update price if changed significantly
          if (priceChanged && productData.price) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                price: productData.price,
              },
            })
          }

          updated++
          results.push({
            productId: product.id,
            name: product.name,
            status: 'updated',
            changes: {
              rating: ratingChanged ? {
                old: currentRating,
                new: productData.starRating || null,
              } : undefined,
              reviewCount: reviewCountChanged ? {
                old: currentReviewCount,
                new: productData.totalReviewCount || null,
              } : undefined,
              price: priceChanged ? {
                old: currentPrice,
                new: productData.price || null,
              } : undefined,
            },
          })

          console.log(`  ✅ Updated`)
          if (ratingChanged) {
            console.log(`     Rating: ${currentRating || 'N/A'} → ${productData.starRating}`)
          }
          if (reviewCountChanged) {
            console.log(`     Reviews: ${currentReviewCount?.toLocaleString() || 'N/A'} → ${productData.totalReviewCount?.toLocaleString()}`)
          }
          if (priceChanged) {
            console.log(`     Price: $${currentPrice?.toFixed(2) || 'N/A'} → $${productData.price?.toFixed(2)}`)
          }
        } else {
          // No changes, but update lastScrapedAt to track we checked
          if (product.metadata) {
            await prisma.productMetadata.update({
              where: { productId: product.id },
              data: {
                lastScrapedAt: new Date(),
              },
            })
          } else {
            await prisma.productMetadata.create({
              data: {
                productId: product.id,
                starRating: productData.starRating || null,
                totalReviewCount: productData.totalReviewCount || null,
                lastScrapedAt: new Date(),
              },
            })
          }

          skipped++
          results.push({
            productId: product.id,
            name: product.name,
            status: 'skipped',
          })
          console.log(`  ⏭️  No changes`)
        }

        // Rate limiting: wait 2 seconds between requests to avoid Amazon blocks
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`)
        failed++
        results.push({
          productId: product.id,
          name: product.name,
          status: 'failed',
        })

        // Wait before next attempt even on error
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    console.log(`\n✅ Update job complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped} (no changes)`)
    console.log(`   Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} products, skipped ${skipped}, failed ${failed}`,
      updated,
      skipped,
      failed,
      total: products.length,
      results: results.slice(0, 20), // Return first 20 results for logging
    })
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

