/**
 * Fix Julep Eyeshadow product that was incorrectly marked as dropped off M&S
 */

import { prisma } from '../lib/prisma'
import { setFirstDetected } from '../lib/trending-products'

async function fixJulepProduct() {
  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: 'Julep Eyeshadow',
        mode: 'insensitive',
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
    console.log('Product not found')
    return
  }

  console.log('Product:', product.name)
  console.log('Current baseScore:', product.baseScore)
  console.log('Current onMoversShakers:', product.onMoversShakers)

  if (product.trendSignals.length > 0) {
    const signal = product.trendSignals[0]
    const salesJump = signal.value || (signal.metadata as any)?.salesJumpPercent || 0
    console.log('Sales jump:', salesJump + '%')

    // Calculate correct score: min(70, salesJump/20), min 10
    const amazonScore = Math.min(70, Math.floor(salesJump / 20))
    const amazonScoreWithMin = Math.max(10, amazonScore)
    console.log('Correct Amazon score:', amazonScoreWithMin)

    // Update to mark as on M&S and set correct baseScore
    await prisma.product.update({
      where: { id: product.id },
      data: {
        onMoversShakers: true,
        lastSeenOnMoversShakers: new Date(),
      },
    })

    await setFirstDetected(product.id, amazonScoreWithMin)

    const updated = await prisma.product.findUnique({
      where: { id: product.id },
      select: {
        baseScore: true,
        currentScore: true,
        onMoversShakers: true,
      },
    })

    console.log('\n✅ Restored!')
    console.log('New baseScore:', updated?.baseScore)
    console.log('New currentScore:', updated?.currentScore)
    console.log('On M&S:', updated?.onMoversShakers)
  }

  await prisma.$disconnect()
}

fixJulepProduct().catch(console.error)


