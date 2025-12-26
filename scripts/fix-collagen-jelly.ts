import { PrismaClient } from '@prisma/client'
import { calculateCurrentScore, updatePeakScore } from '../lib/age-decay'

const prisma = new PrismaClient()

async function fixProduct() {
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'Collagen Jelly', mode: 'insensitive' }
    }
  })
  
  if (!product) {
    console.log('❌ Product not found')
    await prisma.$disconnect()
    return
  }
  
  console.log(`Found product: ${product.name}`)
  console.log(`Current baseScore: ${product.baseScore}`)
  console.log(`Current onMoversShakers: ${product.onMoversShakers}`)
  
  // Set to 100 points (M&S product)
  const newBaseScore = 100
  const result = calculateCurrentScore(newBaseScore, product.firstDetected)
  const newPeakScore = updatePeakScore(result.currentScore, product.peakScore)
  
  await prisma.product.update({
    where: { id: product.id },
    data: {
      baseScore: newBaseScore,
      currentScore: result.currentScore,
      peakScore: newPeakScore,
      daysTrending: result.daysTrending,
      lastUpdated: new Date(),
      onMoversShakers: true,
      lastSeenOnMoversShakers: new Date(),
    },
  })
  
  console.log(`\n✅ Fixed ${product.name}`)
  console.log(`   Base: ${product.baseScore} → ${newBaseScore}`)
  console.log(`   Current: ${result.currentScore}`)
  console.log(`   Days: ${result.daysTrending}`)
  console.log(`   onMoversShakers: ${product.onMoversShakers} → true`)
  console.log(`   First detected: ${product.firstDetected?.toISOString().substring(0, 10)}`)
  
  await prisma.$disconnect()
}

fixProduct().catch(console.error)

