/**
 * Check which products were incorrectly reduced to 50 points
 * that should be 100 because they're currently on Movers & Shakers
 */

import { prisma } from '../lib/prisma'
import { calculateCurrentScore } from '../lib/age-decay'

async function restoreMoversShakersProducts() {
  console.log('🔍 Checking for products that need to be restored to 100 points...\n')

  // Find all products with baseScore 50 that have Amazon signals
  const products = await prisma.product.findMany({
    where: {
      baseScore: 50,
      amazonUrl: { not: null },
    },
    include: {
      trendSignals: {
        where: {
          source: 'amazon_movers',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  console.log(`Found ${products.length} products with baseScore 50 and Amazon data\n`)
  console.log('Please review and mark which ones are CURRENTLY on Movers & Shakers:\n')
  console.log('='.repeat(120))

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const hasAmazonSignal = p.trendSignals.length > 0
    const currentScore = p.currentScore || 0
    const days = p.daysTrending || 0
    
    console.log(`${(i + 1).toString().padStart(3)}. ${p.name.substring(0, 60).padEnd(62)} | Current: ${currentScore.toString().padStart(3)} | Days: ${days.toString().padStart(2)} | Has Amazon Signal: ${hasAmazonSignal ? 'Yes' : 'No '}`)
  }

  console.log('='.repeat(120))
  console.log('\nTo restore specific products to 100 points, you can:')
  console.log('1. Go to Admin Panel → Manual Product Search')
  console.log('2. Search for the product by name or ASIN')
  console.log('3. Toggle "Currently on Movers & Shakers" ON')
  console.log('4. Click "Add This Product to List" to update')
  console.log('\nOR create a list of ASINs/names to bulk update.')

  await prisma.$disconnect()
}

restoreMoversShakersProducts().catch(console.error)

