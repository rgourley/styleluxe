/**
 * Fix baseScore for a product that should be on Movers & Shakers
 * This recalculates baseScore from the trend signals and updates the product
 * 
 * Usage: npx tsx scripts/fix-product-base-score.ts "product-slug"
 */

import { prisma } from '../lib/prisma'
import { setFirstDetected } from '../lib/trending-products'

async function fixProductBaseScore(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      content: {
        slug: slug,
      },
    },
    include: {
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

  if (!product) {
    console.log(`❌ Product with slug "${slug}" not found`)
    return
  }

  console.log(`\n📦 Product: ${product.name}`)
  console.log(`   Current baseScore: ${product.baseScore ?? 'null'}`)
  console.log(`   Current currentScore: ${product.currentScore ?? 'null'}`)
  console.log(`   onMoversShakers: ${product.onMoversShakers ?? 'null'}`)

  if (product.trendSignals.length === 0) {
    console.log(`\n❌ No Amazon M&S signals found for this product`)
    return
  }

  const signal = product.trendSignals[0]
  const metadata = signal.metadata as any
  const salesJump = signal.value || metadata?.salesJumpPercent || 0

  console.log(`\n📊 Signal Data:`)
  console.log(`   Sales Jump: ${salesJump}%`)
  console.log(`   Detected: ${signal.detectedAt.toISOString()}`)

  // Calculate what the baseScore SHOULD be
  let amazonScore = 0
  if (salesJump > 0) {
    amazonScore = Math.min(70, Math.floor(salesJump / 20))
    amazonScore = Math.max(10, amazonScore)
  } else {
    amazonScore = 10 // Base score for being on M&S
  }

  // Reddit score (if any)
  const redditSignals = await prisma.trendSignal.findMany({
    where: {
      productId: product.id,
      source: 'reddit_skincare',
    },
  })

  let redditScore = 0
  const sortedReddit = redditSignals.sort((a, b) => (b.value || 0) - (a.value || 0))
  let highEngagementCount = 0
  for (const signal of sortedReddit) {
    const upvotes = signal.value || 0
    if (upvotes > 500 && highEngagementCount < 2) {
      redditScore += 20
      highEngagementCount++
    } else if (upvotes >= 300 && highEngagementCount < 2) {
      redditScore += 15
      highEngagementCount++
    }
  }
  if (redditSignals.length >= 3) {
    redditScore += 10
  } else if (redditSignals.length >= 2) {
    redditScore += 5
  }
  redditScore = Math.min(30, redditScore)

  const expectedBaseScore = amazonScore + redditScore

  console.log(`\n🧮 Expected Scores:`)
  console.log(`   Amazon Score: ${amazonScore}`)
  console.log(`   Reddit Score: ${redditScore}`)
  console.log(`   Expected baseScore: ${expectedBaseScore}`)

  if (product.baseScore === expectedBaseScore) {
    console.log(`\n✅ baseScore is already correct!`)
    return
  }

  console.log(`\n🔧 Fixing baseScore from ${product.baseScore ?? 'null'} to ${expectedBaseScore}...`)

  // Update the product using setFirstDetected (which handles age decay correctly)
  await setFirstDetected(product.id, expectedBaseScore)

  // Also update the onMoversShakers flag if it's null
  if (product.onMoversShakers === null) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        onMoversShakers: true, // Assume it's on M&S if we have a recent signal
        lastSeenOnMoversShakers: signal.detectedAt,
      },
    })
    console.log(`   ✅ Set onMoversShakers to true`)
  }

  // Refresh to see the updated values
  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      baseScore: true,
      currentScore: true,
      onMoversShakers: true,
    },
  })

  console.log(`\n✅ Updated!`)
  console.log(`   New baseScore: ${updated?.baseScore}`)
  console.log(`   New currentScore: ${updated?.currentScore}`)
  console.log(`   onMoversShakers: ${updated?.onMoversShakers}`)
}

const slug = process.argv[2]
if (!slug) {
  console.error('Usage: npx tsx scripts/fix-product-base-score.ts "product-slug"')
  process.exit(1)
}

fixProductBaseScore(slug)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

