/**
 * Fix Product Scores Script
 * 
 * Recalculates and updates trend scores for all products based on their trend signals.
 * This fixes products that have score 0 but have valid trend signals.
 */

import { prisma } from '../lib/prisma'

function calculateScoreFromSignals(signals: any[]): number {
  let score = 0

  for (const signal of signals) {
    if (signal.source === 'reddit_skincare') {
      const metadata = signal.metadata as any
      const topPost = metadata?.topPost
      const upvotes = topPost?.score || signal.value || 0
      
      if (upvotes > 500) {
        score = Math.max(score, 30)
      } else if (upvotes >= 300) {
        score = Math.max(score, 20)
      } else if (upvotes >= 100) {
        score = Math.max(score, 15)
      } else if (upvotes >= 50) {
        score = Math.max(score, 10)
      } else if (upvotes > 0) {
        score = Math.max(score, 5)
      }
      
      // Add bonuses
      if (topPost?.comments > 50) score += 10
      else if (topPost?.comments > 20) score += 5
      
    } else if (signal.source === 'amazon_movers') {
      const metadata = signal.metadata as any
      const salesJump = signal.value || metadata?.salesJumpPercent || 0
      
      if (salesJump > 1000) {
        score = Math.max(score, 40)
      } else if (salesJump >= 500) {
        score = Math.max(score, 30)
      } else if (salesJump >= 200) {
        score = Math.max(score, 20)
      } else if (salesJump > 0) {
        score = Math.max(score, 15)
      } else {
        // Base score for being on Movers & Shakers
        score = Math.max(score, 20)
      }
    } else if (signal.source === 'google_trends') {
      score = Math.max(score, 20)
    }
  }

  return Math.min(100, score)
}

async function fixProductScores() {
  console.log('Recalculating product trend scores...\n')

  const products = await prisma.product.findMany({
    include: {
      trendSignals: true,
    },
  })

  console.log(`Found ${products.length} products to process\n`)

  let updated = 0

  for (const product of products) {
    if (product.trendSignals.length === 0) {
      continue // Skip products with no signals
    }

    const calculatedScore = calculateScoreFromSignals(product.trendSignals)
    
    // Only update if calculated score is higher than stored score
    if (calculatedScore > product.trendScore) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          trendScore: calculatedScore,
        },
      })
      
      console.log(`✅ ${product.name}: ${product.trendScore} → ${calculatedScore}`)
      updated++
    }
  }

  console.log(`\n✅ Updated ${updated} product scores`)
}

fixProductScores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })









