/**
 * Check if products have age decay fields populated
 */

import { prisma } from '../lib/prisma'

async function checkAgeDecayFields() {
  console.log('Checking age decay fields for all products...\n')

  const products = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      name: true,
      trendScore: true,
      baseScore: true,
      currentScore: true,
      peakScore: true,
      daysTrending: true,
      firstDetected: true,
      lastUpdated: true,
      createdAt: true,
    },
    orderBy: {
      trendScore: 'desc',
    },
  })

  console.log(`Total PUBLISHED products: ${products.length}\n`)

  let withFirstDetected = 0
  let withoutFirstDetected = 0
  let withCurrentScore = 0
  let withoutCurrentScore = 0

  console.log('Product Status:')
  console.log('=' .repeat(100))

  for (const product of products) {
    const hasFirstDetected = product.firstDetected !== null
    const hasCurrentScore = product.currentScore !== null

    if (hasFirstDetected) withFirstDetected++
    else withoutFirstDetected++

    if (hasCurrentScore) withCurrentScore++
    else withoutCurrentScore++

    const status = hasFirstDetected && hasCurrentScore ? '✅' : '❌'
    
    console.log(`${status} ${product.name.substring(0, 50).padEnd(50)} | Score: ${product.trendScore} | Current: ${product.currentScore || 'NULL'} | Days: ${product.daysTrending || 'NULL'} | First: ${product.firstDetected ? product.firstDetected.toISOString().split('T')[0] : 'NULL'}`)
  }

  console.log('\n' + '='.repeat(100))
  console.log(`\nSummary:`)
  console.log(`  ✅ Products with firstDetected: ${withFirstDetected}`)
  console.log(`  ❌ Products WITHOUT firstDetected: ${withoutFirstDetected}`)
  console.log(`  ✅ Products with currentScore: ${withCurrentScore}`)
  console.log(`  ❌ Products WITHOUT currentScore: ${withoutCurrentScore}`)

  if (withoutFirstDetected > 0) {
    console.log(`\n⚠️  WARNING: ${withoutFirstDetected} products don't have firstDetected set!`)
    console.log(`   These products will NOT be updated by recalculateAllScores()`)
    console.log(`   Run the backfill script: npm run backfill-age-decay`)
  }

  if (withCurrentScore === 0) {
    console.log(`\n⚠️  WARNING: NO products have currentScore set!`)
    console.log(`   This means age decay is not working at all.`)
    console.log(`   Run the backfill script: npm run backfill-age-decay`)
  }

  await prisma.$disconnect()
}

checkAgeDecayFields().catch(console.error)


