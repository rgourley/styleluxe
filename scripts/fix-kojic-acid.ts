/**
 * Fix the Kojic Acid product that was manually added with wrong score
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function fixKojicAcid() {
  console.log('🔄 Fixing Kojic Acid Dark Spot Remover Soap...\n')

  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: 'Kojic Acid',
      },
    },
  })

  if (!product) {
    console.log('❌ Product not found')
    return
  }

  console.log(`Found: ${product.name}`)
  console.log(`Current baseScore: ${product.baseScore}`)
  console.log(`Current currentScore: ${product.currentScore}`)
  console.log(`onMoversShakers: ${product.onMoversShakers}`)

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

  console.log(`\n✅ Updated ${product.name}`)
  console.log(`   Base: ${product.baseScore} → ${newBaseScore}`)
  console.log(`   Current: ${product.currentScore} → ${result.currentScore}`)
  console.log(`   Days: ${result.daysTrending}`)
  console.log(`   On M&S: true`)

  await prisma.$disconnect()
}

fixKojicAcid().catch(console.error)

