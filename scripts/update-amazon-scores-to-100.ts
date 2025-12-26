/**
 * Update all Amazon Movers & Shakers products to base score 100
 * This is a one-time migration script
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function updateAmazonScores() {
  console.log('🔄 Updating Amazon M&S products to base score 100...\n')

  try {
    // Find all products with Amazon Movers & Shakers signals
    const products = await prisma.product.findMany({
      where: {
        trendSignals: {
          some: {
            source: 'amazon_movers',
          },
        },
      },
      include: {
        trendSignals: {
          where: {
            source: 'amazon_movers',
          },
        },
      },
    })

    console.log(`Found ${products.length} Amazon M&S products\n`)

    let updated = 0

    for (const product of products) {
      try {
        // Set base score to 100 (all M&S products are viral)
        const baseScore = 100

        // Recalculate current score with age decay
        const result = calculateCurrentScore(baseScore, product.firstDetected)

        await prisma.product.update({
          where: { id: product.id },
          data: {
            trendScore: baseScore, // Update legacy trendScore
            baseScore: baseScore,
            currentScore: result.currentScore,
            peakScore: Math.max(result.currentScore, product.peakScore || 0),
            daysTrending: result.daysTrending,
            lastUpdated: new Date(),
          },
        })

        console.log(`✅ ${product.name.substring(0, 50)} | Base: 100 → Current: ${result.currentScore} (${result.daysTrending} days)`)
        updated++
      } catch (error) {
        console.error(`❌ Error updating ${product.name}:`, error)
      }
    }

    console.log(`\n✅ Update complete!`)
    console.log(`   Updated ${updated} products to base score 100`)

    return { updated }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  updateAmazonScores()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { updateAmazonScores }

