/**
 * Restore specific M&S products to 100 points
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function restoreSpecificProducts() {
  console.log('🔄 Restoring M&S products to 100 points...\n')

  const productsToRestore = [
    'Peel Shot Exfoliating Ampoule',
    'medicube Triple Collagen Cream',
  ]

  for (const productName of productsToRestore) {
    const product = await prisma.product.findFirst({
      where: {
        name: {
          contains: productName,
        },
      },
    })

    if (!product) {
      console.log(`❌ Product not found: ${productName}`)
      continue
    }

    console.log(`Found: ${product.name}`)
    console.log(`  Current baseScore: ${product.baseScore}`)
    console.log(`  Current currentScore: ${product.currentScore}`)
    console.log(`  onMoversShakers: ${product.onMoversShakers}`)

    // Update to 100 base score with age decay
    const newBaseScore = 100
    const result = calculateCurrentScore(newBaseScore, product.firstDetected)

    await prisma.product.update({
      where: { id: product.id },
      data: {
        baseScore: newBaseScore,
        currentScore: result.currentScore,
        trendScore: newBaseScore,
        peakScore: Math.max(result.currentScore, product.peakScore || 0),
        daysTrending: result.daysTrending,
        onMoversShakers: true,
        lastSeenOnMoversShakers: new Date(),
      },
    })

    console.log(`  ✅ Updated to 100 base score (current: ${result.currentScore}, days: ${result.daysTrending})`)
    console.log()
  }

  console.log('✅ Done!')

  await prisma.$disconnect()
}

restoreSpecificProducts().catch(console.error)




