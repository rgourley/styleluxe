#!/usr/bin/env tsx
/**
 * Backfill script to populate age decay fields for existing products
 * Sets firstDetected, baseScore, currentScore, peakScore, daysTrending for products that don't have them
 * 
 * Usage:
 *   tsx scripts/backfill-age-decay.ts
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore, calculateDaysTrending, updatePeakScore } from '../lib/age-decay'

async function backfillAgeDecay() {
  console.log('🔄 Starting age decay backfill...')
  console.log(`Time: ${new Date().toISOString()}\n`)

  try {
    // Find all products that need backfilling (missing firstDetected or baseScore)
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { firstDetected: null },
          { baseScore: null },
        ],
      },
      include: {
        trendSignals: {
          orderBy: {
            detectedAt: 'asc', // Get earliest signal
          },
          take: 1,
        },
      },
    })

    console.log(`Found ${products.length} products to backfill\n`)

    let updated = 0
    let errors = 0

    for (const product of products) {
      try {
        // Determine firstDetected date
        // Use earliest trend signal, or createdAt if no signals
        let firstDetected: Date
        if (product.trendSignals.length > 0 && product.trendSignals[0].detectedAt) {
          firstDetected = product.trendSignals[0].detectedAt
        } else {
          firstDetected = product.createdAt
        }

        // Use current trendScore as baseScore (or 0 if null)
        const baseScore = product.trendScore || 0

        // Calculate current score with age decay
        const result = calculateCurrentScore(baseScore, firstDetected)
        
        // Set peak score (use baseScore as initial peak)
        const peakScore = updatePeakScore(result.currentScore, baseScore)

        // Update product with all age decay fields
        await prisma.product.update({
          where: { id: product.id },
          data: {
            firstDetected: firstDetected,
            baseScore: baseScore,
            currentScore: result.currentScore,
            peakScore: peakScore,
            daysTrending: result.daysTrending,
            lastUpdated: new Date(),
          },
        })

        updated++
        
        if (updated % 10 === 0) {
          console.log(`  Processed ${updated}/${products.length} products...`)
        }
      } catch (error) {
        console.error(`  ❌ Error updating product ${product.id} (${product.name}):`, error)
        errors++
      }
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   - Updated: ${updated} products`)
    console.log(`   - Errors: ${errors}`)

    // Also recalculate scores for products that already have firstDetected
    // (in case their baseScore changed or they need recalculation)
    console.log(`\n🔄 Recalculating scores for products with existing data...`)
    const { recalculateAllScores } = await import('../lib/trending-products')
    const recalcResult = await recalculateAllScores()
    console.log(`   - Recalculated: ${recalcResult.updated} products`)
    console.log(`   - Errors: ${recalcResult.errors}`)

    return { updated, errors, recalculated: recalcResult.updated }
  } catch (error) {
    console.error('❌ Error in backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  backfillAgeDecay()
    .then((result) => {
      console.log(`\n✅ All done!`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

export { backfillAgeDecay }

