/**
 * Diagnostic script to check why a product has a specific score
 * Usage: npx tsx scripts/check-product-score.ts "product-slug"
 */

import { prisma } from '../lib/prisma'

async function checkProductScore(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      content: {
        slug: slug,
      },
    },
    include: {
      trendSignals: {
        orderBy: {
          detectedAt: 'desc',
        },
      },
      content: true,
    },
  })

  if (!product) {
    console.log(`❌ Product with slug "${slug}" not found`)
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log(`📦 PRODUCT: ${product.name}`)
  console.log('='.repeat(80))
  console.log(`\n📊 SCORES:`)
  console.log(`   baseScore: ${product.baseScore ?? 'null'}`)
  console.log(`   currentScore: ${product.currentScore ?? 'null'}`)
  console.log(`   trendScore: ${product.trendScore ?? 'null'}`)
  console.log(`   peakScore: ${product.peakScore ?? 'null'}`)
  console.log(`\n📅 TIMING:`)
  console.log(`   firstDetected: ${product.firstDetected?.toISOString() ?? 'null'}`)
  console.log(`   daysTrending: ${product.daysTrending ?? 'null'}`)
  console.log(`   lastUpdated: ${product.lastUpdated?.toISOString() ?? 'null'}`)
  console.log(`\n🏷️  STATUS:`)
  console.log(`   status: ${product.status}`)
  console.log(`   onMoversShakers: ${product.onMoversShakers ?? 'null'}`)
  console.log(`   lastSeenOnMoversShakers: ${product.lastSeenOnMoversShakers?.toISOString() ?? 'null'}`)
  console.log(`\n📈 TRAFFIC:`)
  console.log(`   pageViews: ${(product as any).pageViews ?? 'null'}`)
  console.log(`   clicks: ${(product as any).clicks ?? 'null'}`)
  console.log(`   lastViewedAt: ${(product as any).lastViewedAt?.toISOString() ?? 'null'}`)
  
  console.log(`\n🔔 TREND SIGNALS (${product.trendSignals.length}):`)
  if (product.trendSignals.length === 0) {
    console.log('   No trend signals found')
  } else {
    product.trendSignals.forEach((signal, i) => {
      console.log(`\n   ${i + 1}. ${signal.source}`)
      console.log(`      Type: ${signal.signalType}`)
      console.log(`      Value: ${signal.value ?? 'null'}`)
      console.log(`      Detected: ${signal.detectedAt.toISOString()}`)
      if (signal.metadata) {
        const meta = signal.metadata as any
        if (meta.salesJumpPercent) {
          console.log(`      Sales Jump: ${meta.salesJumpPercent}%`)
        }
        if (meta.position) {
          console.log(`      Position: #${meta.position}`)
        }
        if (meta.topPost) {
          console.log(`      Top Post Upvotes: ${meta.topPost.score}`)
          console.log(`      Top Post Comments: ${meta.topPost.comments}`)
        }
      }
    })
  }

  // Calculate what the score SHOULD be
  console.log(`\n🧮 SCORE CALCULATION:`)
  
  const amazonSignals = product.trendSignals.filter(s => s.source === 'amazon_movers')
  const redditSignals = product.trendSignals.filter(s => s.source === 'reddit_skincare')
  
  let amazonScore = 0
  if (amazonSignals.length > 0) {
    const signal = amazonSignals[0]
    const metadata = signal.metadata as any
    const salesJump = signal.value || metadata?.salesJumpPercent || 0
    if (salesJump > 0) {
      amazonScore = Math.min(70, Math.floor(salesJump / 20))
      amazonScore = Math.max(10, amazonScore)
    } else {
      amazonScore = 10 // Base score for being on M&S
    }
    console.log(`   Amazon Score: ${amazonScore} (from ${salesJump}% sales jump)`)
  } else {
    console.log(`   Amazon Score: 0 (no Amazon M&S signals)`)
  }
  
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
  console.log(`   Reddit Score: ${redditScore} (from ${redditSignals.length} signals)`)
  
  const expectedTrendScore = amazonScore + redditScore
  console.log(`   Expected trendScore: ${expectedTrendScore}`)
  
  // Check age decay
  if (product.firstDetected && product.baseScore) {
    const { calculateCurrentScore } = await import('../lib/age-decay')
    const result = calculateCurrentScore(
      product.baseScore,
      product.firstDetected,
      (product as any).pageViews || 0,
      (product as any).clicks || 0,
      product.onMoversShakers === false && product.lastSeenOnMoversShakers !== null // droppedOffMS
    )
    console.log(`\n   Age Decay Calculation:`)
    console.log(`      baseScore: ${product.baseScore}`)
    console.log(`      daysTrending: ${result.daysTrending}`)
    console.log(`      Expected currentScore: ${result.currentScore}`)
    console.log(`      Actual currentScore: ${product.currentScore}`)
    
    if (Math.abs((product.currentScore || 0) - result.currentScore) > 1) {
      console.log(`\n   ⚠️  WARNING: currentScore doesn't match expected calculation!`)
      console.log(`      Difference: ${Math.abs((product.currentScore || 0) - result.currentScore)}`)
    }
  }
  
  console.log(`\n${'='.repeat(80)}\n`)
}

const slug = process.argv[2]
if (!slug) {
  console.error('Usage: npx tsx scripts/check-product-score.ts "product-slug"')
  process.exit(1)
}

checkProductScore(slug)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

