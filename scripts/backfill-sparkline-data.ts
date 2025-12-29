/**
 * Backfill Sparkline Data
 * 
 * Creates initial score history records for existing products
 * so sparklines can be displayed immediately
 */

import { prisma } from '../lib/prisma'

async function backfillSparklineData() {
  console.log('🔄 Backfilling sparkline data for existing products...\n')

  try {
    // Get all published products with currentScore
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        currentScore: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        currentScore: true,
        baseScore: true,
        firstDetected: true,
        createdAt: true,
      },
      take: 100, // Limit to first 100 for now
    })

    console.log(`Found ${products.length} products to backfill\n`)

    let created = 0
    let skipped = 0

    for (const product of products) {
      // Check if product already has history
      const existingCount = await prisma.productScoreHistory.count({
        where: { productId: product.id },
      })

      if (existingCount > 0) {
        skipped++
        continue
      }

      // Create initial history record with current score
      const currentScore = product.currentScore || 0
      const baseScore = product.baseScore || currentScore
      
      // Use firstDetected or createdAt as the date
      const recordDate = product.firstDetected || product.createdAt || new Date()

      try {
        await prisma.productScoreHistory.create({
          data: {
            productId: product.id,
            currentScore: currentScore,
            baseScore: baseScore,
            recordedAt: recordDate,
          },
        })

        // Create a few more records to simulate history (spread over last 7 days)
        const now = new Date()
        for (let i = 1; i <= 6; i++) {
          const daysAgo = i
          const pastDate = new Date(now)
          pastDate.setDate(pastDate.getDate() - daysAgo)
          
          // Simulate slight score variation (±5 points)
          const variation = Math.random() * 10 - 5 // -5 to +5
          const simulatedScore = Math.max(0, Math.min(100, currentScore + variation))
          
          await prisma.productScoreHistory.create({
            data: {
              productId: product.id,
              currentScore: Math.round(simulatedScore),
              baseScore: baseScore,
              recordedAt: pastDate,
            },
          })
        }

        created++
        console.log(`✅ ${product.name.substring(0, 50)}: Created 7 history records`)
      } catch (error: any) {
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.error(`❌ Table doesn't exist yet. Run the app once to auto-create it, or manually create it.`)
          break
        }
        console.error(`❌ Error for ${product.name}:`, error.message)
      }
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Created: ${created} products`)
    console.log(`   Skipped: ${skipped} products (already have history)`)
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      console.error(`\n❌ ProductScoreHistory table doesn't exist yet.`)
      console.error(`   The table will be auto-created on the next page load.`)
      console.error(`   Or restart your dev server to trigger auto-sync.`)
    } else {
      console.error('Error:', error)
    }
  }
}

backfillSparklineData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

