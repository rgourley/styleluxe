/**
 * Fix scores for Reddit-only products and products that dropped off M&S
 * These should have base score 40-50, not 100
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function fixRedditOnlyScores() {
  console.log('🔄 Fixing scores for Reddit-only and dropped M&S products...\n')

  // Find all products with baseScore 100 but NOT currently on M&S
  const productsToFix = await prisma.product.findMany({
    where: {
      baseScore: 100,
      OR: [
        { onMoversShakers: false }, // Dropped off M&S
        { onMoversShakers: null },  // Never tracked
      ],
    },
    include: {
      trendSignals: true,
    },
  })

  console.log(`Found ${productsToFix.length} products with score 100 but NOT on M&S\n`)

  let fixed = 0

  for (const product of productsToFix) {
    // Check if this is a Reddit-only product (no Amazon M&S signals)
    const hasAmazonSignal = product.trendSignals.some(s => s.source === 'amazon_movers')
    
    let newBaseScore = 50 // Default for dropped M&S products
    
    if (!hasAmazonSignal) {
      // Reddit-only product - calculate Reddit score (0-50)
      const redditSignals = product.trendSignals
        .filter(s => s.source === 'reddit_skincare')
        .sort((a, b) => (b.value || 0) - (a.value || 0))
      
      let redditScore = 0
      let highEngagementCount = 0
      
      for (const signal of redditSignals) {
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
      
      newBaseScore = Math.min(50, redditScore)
      console.log(`  📱 Reddit-only: ${product.name.substring(0, 50)} | 100 → ${newBaseScore}`)
    } else {
      // Has Amazon signal but dropped off M&S
      console.log(`  ⬇️  Dropped M&S: ${product.name.substring(0, 50)} | 100 → ${newBaseScore}`)
    }
    
    // Recalculate with age decay
    const result = calculateCurrentScore(newBaseScore, product.firstDetected)
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        baseScore: newBaseScore,
        currentScore: result.currentScore,
        trendScore: newBaseScore,
        peakScore: Math.max(result.currentScore, product.peakScore || 0),
      },
    })
    
    fixed++
  }

  console.log(`\n✅ Fixed ${fixed} products`)
  console.log(`   - Reddit-only products now have appropriate scores (0-50)`)
  console.log(`   - Dropped M&S products now have score 50`)

  await prisma.$disconnect()
}

fixRedditOnlyScores().catch(console.error)

