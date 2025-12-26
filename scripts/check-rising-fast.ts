/**
 * Check which products should be in Rising Fast section
 */

import { prisma } from '../lib/prisma'

async function checkRisingFast() {
  console.log('Checking products for Rising Fast section (40-69 points)...\n')

  // Check products that should be in Rising Fast
  const risingFast = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      content: { isNot: null },
      AND: [
        {
          OR: [
            {
              AND: [
                { currentScore: { gte: 40, lt: 70 } },
                { daysTrending: { lte: 14 } },
              ],
            },
            {
              AND: [
                { currentScore: null },
                { trendScore: { gte: 40, lt: 70 } },
              ],
            },
          ],
        },
        {
          OR: [
            { price: { gte: 5 } },
            { price: null },
          ],
        },
      ],
    },
    select: {
      name: true,
      currentScore: true,
      trendScore: true,
      daysTrending: true,
      onMoversShakers: true,
      price: true,
    },
    take: 10,
  })

  console.log(`Products in Rising Fast range: ${risingFast.length}\n`)

  if (risingFast.length === 0) {
    console.log('❌ No products found in 40-69 range!\n')
    console.log('Checking all published products with scores:\n')

    const allProducts = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        content: { isNot: null },
      },
      select: {
        name: true,
        currentScore: true,
        trendScore: true,
        daysTrending: true,
        onMoversShakers: true,
        price: true,
      },
      orderBy: { currentScore: 'desc' },
      take: 20,
    })

    console.log('All published products with content:')
    console.log('='.repeat(120))
    for (const p of allProducts) {
      const score = p.currentScore || p.trendScore || 0
      const days = p.daysTrending || 0
      const onMS = p.onMoversShakers ? 'Yes' : 'No '
      const price = p.price ? `$${p.price.toFixed(2)}` : 'N/A'
      
      console.log(`${p.name.substring(0, 50).padEnd(52)} | Score: ${score.toString().padStart(3)} | Days: ${days.toString().padStart(2)} | M&S: ${onMS} | Price: ${price}`)
    }
  } else {
    console.log('Products in Rising Fast:')
    console.log('='.repeat(120))
    for (const p of risingFast) {
      const score = p.currentScore || p.trendScore || 0
      const days = p.daysTrending || 0
      const onMS = p.onMoversShakers ? 'Yes' : 'No '
      const price = p.price ? `$${p.price.toFixed(2)}` : 'N/A'
      
      console.log(`${p.name.substring(0, 50).padEnd(52)} | Score: ${score.toString().padStart(3)} | Days: ${days.toString().padStart(2)} | M&S: ${onMS} | Price: ${price}`)
    }
  }

  await prisma.$disconnect()
}

checkRisingFast().catch(console.error)

