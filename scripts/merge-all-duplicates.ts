/**
 * Find and merge all duplicate products by ASIN
 * Keeps PUBLISHED versions and merges/deletes others
 */

import { prisma } from '../lib/prisma'
import { setFirstDetected } from '../lib/trending-products'

/**
 * Extract ASIN from Amazon URL
 */
function extractASIN(url: string | null): string | null {
  if (!url) return null
  
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

async function mergeAllDuplicates() {
  console.log('🔍 Finding all products with Amazon URLs...\n')
  
  // Get all products with Amazon URLs
  const allProducts = await prisma.product.findMany({
    where: {
      amazonUrl: { not: null },
    },
    include: {
      content: true,
      trendSignals: true,
      reviews: true,
    },
  })
  
  console.log(`Found ${allProducts.length} products with Amazon URLs\n`)
  
  // Group by ASIN
  const asinGroups = new Map<string, typeof allProducts>()
  
  for (const product of allProducts) {
    const asin = extractASIN(product.amazonUrl)
    if (!asin) continue
    
    if (!asinGroups.has(asin)) {
      asinGroups.set(asin, [])
    }
    asinGroups.get(asin)!.push(product)
  }
  
  // Find groups with duplicates
  const duplicates = Array.from(asinGroups.entries()).filter(
    ([_, products]) => products.length > 1
  )
  
  console.log(`Found ${duplicates.length} ASINs with duplicate products\n`)
  
  let totalMerged = 0
  let totalDeleted = 0
  
  for (const [asin, products] of duplicates) {
    console.log(`\n📦 ASIN: ${asin} (${products.length} duplicates)`)
    
    // Choose primary: prefer PUBLISHED, then on M&S, then first one
    const published = products.find(p => p.status === 'PUBLISHED')
    const onMS = products.find(p => p.onMoversShakers === true)
    const primary = published || onMS || products[0]
    
    const duplicates = products.filter(p => p.id !== primary.id)
    
    console.log(`  Primary: ${primary.name} (${primary.status})`)
    console.log(`  Duplicates: ${duplicates.length}`)
    
    // Get best data from all products
    let maxScore = primary.baseScore || primary.currentScore || primary.trendScore || 0
    let maxOnMS = primary.onMoversShakers || false
    let maxLastSeen = primary.lastSeenOnMoversShakers
    let bestName = primary.name
    let bestStatus = primary.status
    
    // Prefer PUBLISHED name and status
    if (published) {
      bestName = published.name
      bestStatus = published.status
    }
    
    for (const dup of duplicates) {
      const dupScore = dup.baseScore || dup.currentScore || dup.trendScore || 0
      if (dupScore > maxScore) maxScore = dupScore
      if (dup.onMoversShakers) {
        maxOnMS = true
        if (!maxLastSeen || (dup.lastSeenOnMoversShakers && dup.lastSeenOnMoversShakers > maxLastSeen)) {
          maxLastSeen = dup.lastSeenOnMoversShakers
        }
      }
      
      // Transfer signals
      for (const signal of dup.trendSignals) {
        await prisma.trendSignal.update({
          where: { id: signal.id },
          data: { productId: primary.id },
        })
      }
      
      // Transfer reviews
      for (const review of dup.reviews) {
        await prisma.review.update({
          where: { id: review.id },
          data: { productId: primary.id },
        })
      }
      
      // Transfer content if primary doesn't have it
      if (dup.content && !primary.content) {
        await prisma.productContent.update({
          where: { id: dup.content.id },
          data: { productId: primary.id },
        })
      } else if (dup.content && primary.content) {
        // If both have content, keep primary's but merge previousSlugs if needed
        if (dup.content.slug && dup.content.slug !== primary.content.slug) {
          const previousSlugs = (primary.content.previousSlugs as string[]) || []
          if (!previousSlugs.includes(dup.content.slug)) {
            previousSlugs.push(dup.content.slug)
            await prisma.productContent.update({
              where: { id: primary.content.id },
              data: { previousSlugs },
            })
          }
        }
      }
      
      // Delete duplicate
      await prisma.product.delete({ where: { id: dup.id } })
      totalDeleted++
      console.log(`    ✅ Merged and deleted: ${dup.name}`)
    }
    
    // Update primary with best data
    const allSignals = await prisma.trendSignal.findMany({
      where: { productId: primary.id },
      orderBy: { detectedAt: 'desc' },
    })
    
    // Recalculate Amazon score from signals
    let amazonScore = 0
    for (const signal of allSignals) {
      if (signal.source === 'amazon_movers') {
        const metadata = signal.metadata as any
        const salesJump = signal.value || metadata?.salesJumpPercent || 0
        if (salesJump > 0) {
          const calculatedScore = Math.min(70, Math.floor(salesJump / 20))
          amazonScore = Math.max(10, calculatedScore)
          break
        } else {
          amazonScore = 10
        }
      }
    }
    
    // Update primary product
    await prisma.product.update({
      where: { id: primary.id },
      data: {
        name: bestName,
        status: bestStatus,
        onMoversShakers: maxOnMS,
        lastSeenOnMoversShakers: maxLastSeen,
      },
    })
    
    // Update baseScore if we have Amazon signals
    if (amazonScore > 0) {
      await setFirstDetected(primary.id, amazonScore)
    }
    
    // Sync trendScore with currentScore
    const updated = await prisma.product.findUnique({
      where: { id: primary.id },
    })
    
    if (updated) {
      await prisma.product.update({
        where: { id: primary.id },
        data: { trendScore: updated.currentScore || updated.baseScore },
      })
    }
    
    totalMerged++
    console.log(`  ✅ Merged into: ${bestName} (${bestStatus})`)
  }
  
  console.log(`\n\n✅ Merge complete!`)
  console.log(`  ASINs processed: ${totalMerged}`)
  console.log(`  Products deleted: ${totalDeleted}`)
  
  await prisma.$disconnect()
}

mergeAllDuplicates().catch(console.error)

