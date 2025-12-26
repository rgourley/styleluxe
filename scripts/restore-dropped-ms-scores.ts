/**
 * Restore scores for products that dropped off Movers & Shakers
 * Applies gradual reduction (10-15 points) instead of instant 50-point drop
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function restoreDroppedMSScores() {
  console.log('🔍 Finding products that dropped off Movers & Shakers...\n')

  // Find products that:
  // 1. Are marked as NOT on M&S (onMoversShakers = false)
  // 2. Were seen on M&S recently (lastSeenOnMoversShakers in last 2 days)
  // 3. Have a baseScore that suggests they were on M&S (baseScore >= 80)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 2)

  const droppedProducts = await prisma.product.findMany({
    where: {
      onMoversShakers: false,
      lastSeenOnMoversShakers: {
        gte: yesterday, // Seen on M&S in last 2 days
      },
      baseScore: {
        lte: 60, // Likely had score reduced to 50 or below
        gte: 0,
      },
    },
    select: {
      id: true,
      name: true,
      baseScore: true,
      currentScore: true,
      firstDetected: true,
      lastSeenOnMoversShakers: true,
    },
    orderBy: {
      lastSeenOnMoversShakers: 'desc', // Most recently dropped first
    },
    take: 20, // Check up to 20 products
  })

  console.log(`Found ${droppedProducts.length} products that may have been affected\n`)

  if (droppedProducts.length === 0) {
    console.log('✅ No products found that need restoration')
    return
  }

  let restored = 0
  let skipped = 0

  for (const product of droppedProducts) {
    // Check if this product likely had a 100 base score before dropping
    // If baseScore is 50 or close to it, it was probably reduced from 100
    const likelyWas100 = product.baseScore !== null && product.baseScore <= 55 && product.baseScore >= 45

    if (!likelyWas100) {
      console.log(`⏭️  Skipping ${product.name.substring(0, 50)}... (baseScore: ${product.baseScore}, doesn't look like it was reduced from 100)`)
      skipped++
      continue
    }

    // Restore: reduce by 10-15 points from 100 instead of dropping to 50
    const originalBaseScore = 100
    const reduction = Math.min(15, Math.max(10, Math.floor(originalBaseScore * 0.12))) // 10-15 points
    const newBaseScore = originalBaseScore - reduction // Should be 85-90

    // Calculate new current score with faster decay (dropped off M&S)
    // Use 0 for pageViews/clicks since migration hasn't run yet
    const result = calculateCurrentScore(
      newBaseScore,
      product.firstDetected,
      0, // pageViews - will be available after migration
      0, // clicks - will be available after migration
      true // droppedOffMS = true for faster decay
    )

    const oldBaseScore = product.baseScore
    const oldCurrentScore = product.currentScore
    const newCurrentScore = result.currentScore

    // Only update if the new score is significantly different
    if (Math.abs(newCurrentScore - (oldCurrentScore || 0)) > 5) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          baseScore: newBaseScore,
          currentScore: newCurrentScore,
          daysTrending: result.daysTrending,
          trendScore: newCurrentScore, // Update legacy score too
        },
      })

      console.log(`✅ Restored ${product.name.substring(0, 50)}...`)
      console.log(`   Base: ${oldBaseScore} → ${newBaseScore} (reduced by ${reduction} from 100)`)
      console.log(`   Current: ${oldCurrentScore || 0} → ${newCurrentScore}`)
      console.log()

      restored++
    } else {
      console.log(`⏭️  Skipping ${product.name.substring(0, 50)}... (score already close to expected)`)
      skipped++
    }
  }

  console.log(`\n✅ Restoration complete!`)
  console.log(`   - Restored: ${restored} products`)
  console.log(`   - Skipped: ${skipped} products`)
}

restoreDroppedMSScores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

