/**
 * Merge duplicate Centellian/Madeca products into one
 */

import { prisma } from '../lib/prisma'
import { setFirstDetected } from '../lib/trending-products'

async function mergeCentellianDuplicates() {
  // Find all products with this ASIN
  const products = await prisma.product.findMany({
    where: {
      amazonUrl: { contains: 'B0G2BF2KS2' },
    },
    include: {
      content: true,
      trendSignals: true,
      reviews: true,
    },
  })

  console.log(`Found ${products.length} duplicate products\n`)

  // Choose primary product: prefer PUBLISHED, then on M&S, then first one
  const published = products.find(p => p.status === 'PUBLISHED')
  const onMS = products.find(p => p.onMoversShakers === true)
  const primary = published || onMS || products[0]

  console.log('Primary product (to keep):')
  console.log(`  ID: ${primary.id}`)
  console.log(`  Name: ${primary.name}`)
  console.log(`  Status: ${primary.status}`)
  console.log(`  Slug: ${primary.content?.slug || 'none'}`)
  console.log(`  Score: ${primary.currentScore || primary.baseScore}`)
  console.log(`  On M&S: ${primary.onMoversShakers}`)

  const duplicates = products.filter(p => p.id !== primary.id)
  console.log(`\nDuplicates to merge: ${duplicates.length}`)

  // Get highest score from all products
  let maxScore = primary.baseScore || primary.currentScore || primary.trendScore || 0
  let maxOnMS = primary.onMoversShakers || false
  let maxLastSeen = primary.lastSeenOnMoversShakers

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
    console.log(`\n  Merging ${dup.id}...`)
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
    }

    // Delete duplicate
    await prisma.product.delete({ where: { id: dup.id } })
    console.log(`    ✅ Merged and deleted`)
  }

  // Update primary with best data
  const allSignals = await prisma.trendSignal.findMany({
    where: { productId: primary.id },
  })

  // Recalculate score from all signals
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
      onMoversShakers: maxOnMS,
      lastSeenOnMoversShakers: maxLastSeen,
      // Use the name from primary (should be "Madeca Derma Mask 3" if that's the PUBLISHED one)
    },
  })

  // Update baseScore using setFirstDetected
  await setFirstDetected(primary.id, amazonScore)

  const updated = await prisma.product.findUnique({
    where: { id: primary.id },
    include: {
      content: true,
      trendSignals: true,
    },
  })

  console.log(`\n✅ Merge complete!`)
  console.log(`  Final name: ${updated?.name}`)
  console.log(`  Status: ${updated?.status}`)
  console.log(`  Slug: ${updated?.content?.slug || 'none'}`)
  console.log(`  Base Score: ${updated?.baseScore}`)
  console.log(`  Current Score: ${updated?.currentScore}`)
  console.log(`  Trend Score: ${updated?.trendScore}`)
  console.log(`  On M&S: ${updated?.onMoversShakers}`)
  console.log(`  Total signals: ${updated?.trendSignals.length}`)

  await prisma.$disconnect()
}

mergeCentellianDuplicates().catch(console.error)


