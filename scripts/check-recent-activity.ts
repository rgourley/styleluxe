/**
 * Check for recent product updates and score changes in the last 2 days
 */

async function checkRecentActivity() {
  const { prisma } = await import('../lib/prisma')
  
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  
  console.log(`\n🔍 Checking for activity since ${twoDaysAgo.toLocaleString()}\n`)
  console.log('='.repeat(60))
  
  // Check products updated in last 2 days
  const recentlyUpdated = await prisma.product.findMany({
    where: {
      OR: [
        { lastUpdated: { gte: twoDaysAgo } },
        { updatedAt: { gte: twoDaysAgo } },
      ],
    },
    select: {
      id: true,
      name: true,
      baseScore: true,
      currentScore: true,
      peakScore: true,
      daysTrending: true,
      firstDetected: true,
      lastUpdated: true,
      updatedAt: true,
      status: true,
    },
    orderBy: {
      lastUpdated: 'desc',
    },
  })
  
  console.log(`\n📦 Products updated in last 2 days: ${recentlyUpdated.length}\n`)
  
  if (recentlyUpdated.length === 0) {
    console.log('❌ No products have been updated recently.')
    console.log('\n💡 This means:')
    console.log('   - The cron job may not have run yet')
    console.log('   - Products haven\'t been manually updated')
    console.log('   - The age decay system hasn\'t recalculated scores\n')
    
    // Check when cron last ran by looking at most recent lastUpdated
    const mostRecent = await prisma.product.findFirst({
      where: {
        lastUpdated: { not: null },
      },
      orderBy: {
        lastUpdated: 'desc',
      },
      select: {
        name: true,
        lastUpdated: true,
      },
    })
    
    if (mostRecent?.lastUpdated) {
      const daysSince = Math.floor((Date.now() - mostRecent.lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`📅 Last product update: ${daysSince} days ago (${mostRecent.name})`)
      console.log(`   Date: ${mostRecent.lastUpdated.toLocaleString()}\n`)
    }
  } else {
    recentlyUpdated.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`)
      console.log(`   Status: ${product.status}`)
      console.log(`   Base Score: ${product.baseScore ?? 'N/A'}`)
      console.log(`   Current Score: ${product.currentScore ?? 'N/A'}`)
      console.log(`   Peak Score: ${product.peakScore ?? 'N/A'}`)
      console.log(`   Days Trending: ${product.daysTrending ?? 'N/A'}`)
      if (product.firstDetected) {
        console.log(`   First Detected: ${product.firstDetected.toLocaleDateString()}`)
      }
      if (product.lastUpdated) {
        console.log(`   Last Updated: ${product.lastUpdated.toLocaleString()}`)
      }
    })
  }
  
  // Check for new trend signals in last 2 days
  const recentSignals = await prisma.trendSignal.findMany({
    where: {
      detectedAt: { gte: twoDaysAgo },
    },
    select: {
      id: true,
      source: true,
      value: true,
      detectedAt: true,
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      detectedAt: 'desc',
    },
    take: 20,
  })
  
  console.log(`\n\n📊 New trend signals in last 2 days: ${recentSignals.length}\n`)
  
  if (recentSignals.length > 0) {
    recentSignals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.product.name}`)
      console.log(`   Source: ${signal.source}`)
      console.log(`   Value: ${signal.value ?? 'N/A'}`)
      console.log(`   Detected: ${signal.detectedAt.toLocaleString()}`)
    })
  }
  
  // Check products that would have moved based on age decay
  const allProducts = await prisma.product.findMany({
    where: {
      firstDetected: { not: null },
      status: { in: ['PUBLISHED', 'FLAGGED'] },
    },
    select: {
      id: true,
      name: true,
      baseScore: true,
      currentScore: true,
      daysTrending: true,
      firstDetected: true,
    },
  })
  
  console.log(`\n\n🎯 Products that should have age decay applied: ${allProducts.length}`)
  
  const { calculateCurrentScore } = await import('../lib/age-decay')
  
  let movedCount = 0
  for (const product of allProducts) {
    if (product.firstDetected) {
      const result = calculateCurrentScore(product.baseScore, product.firstDetected)
      const expectedScore = result.currentScore
      const expectedDays = result.daysTrending
      
      // Check if current values don't match expected (meaning they need recalculation)
      if (
        product.currentScore !== expectedScore ||
        product.daysTrending !== expectedDays
      ) {
        movedCount++
        if (movedCount <= 10) {
          console.log(`\n⚠️  ${product.name}`)
          console.log(`   Current Score: ${product.currentScore ?? 'N/A'} → Should be: ${expectedScore}`)
          console.log(`   Days Trending: ${product.daysTrending ?? 'N/A'} → Should be: ${expectedDays}`)
        }
      }
    }
  }
  
  if (movedCount > 10) {
    console.log(`\n... and ${movedCount - 10} more products need score recalculation`)
  }
  
  if (movedCount > 0) {
    console.log(`\n\n💡 ${movedCount} products need their scores recalculated.`)
    console.log('   Run: npm run backfill:age-decay or trigger the daily update cron job.\n')
  } else if (allProducts.length > 0) {
    console.log('\n✅ All product scores are up to date!\n')
  }
  
  await prisma.$disconnect()
}

checkRecentActivity().catch(console.error)




