import { prisma } from '../lib/prisma'

async function checkProducts() {
  console.log('🔍 Checking products in database...\n')
  
  const totalProducts = await prisma.product.count()
  console.log(`Total products: ${totalProducts}`)
  
  const publishedProducts = await prisma.product.count({
    where: { status: 'PUBLISHED' }
  })
  console.log(`Published products: ${publishedProducts}`)
  
  const productsWithContent = await prisma.product.count({
    where: {
      status: 'PUBLISHED',
      content: { isNot: null }
    }
  })
  console.log(`Published products with content: ${productsWithContent}`)
  
  const productsWithPriceFilter = await prisma.product.count({
    where: {
      status: 'PUBLISHED',
      content: { isNot: null },
      OR: [
        { price: { gte: 5 } },
        { price: null }
      ]
    }
  })
  console.log(`Published products with content and price >= $5: ${productsWithPriceFilter}`)
  
  const trendingNowProducts = await prisma.product.count({
    where: {
      status: 'PUBLISHED',
      content: { isNot: null },
      AND: [
        {
          OR: [
            { currentScore: { gte: 70 } },
            {
              AND: [
                { currentScore: null },
                { trendScore: { gte: 70 } }
              ]
            }
          ]
        },
        {
          OR: [
            { daysTrending: { lte: 7 } },
            { daysTrending: null }
          ]
        },
        {
          OR: [
            { price: { gte: 5 } },
            { price: null }
          ]
        }
      ]
    }
  })
  console.log(`"Trending Now" eligible products: ${trendingNowProducts}`)
  
  const aboutToExplodeProducts = await prisma.product.count({
    where: {
      status: 'PUBLISHED',
      content: { isNot: null },
      AND: [
        {
          OR: [
            {
              AND: [
                { currentScore: { gte: 50, lte: 69 } },
                {
                  OR: [
                    { daysTrending: { lte: 7 } },
                    { daysTrending: null }
                  ]
                }
              ]
            },
            {
              AND: [
                { currentScore: null },
                { trendScore: { gte: 50, lte: 69 } }
              ]
            }
          ]
        },
        {
          OR: [
            { price: { gte: 5 } },
            { price: null }
          ]
        }
      ]
    }
  })
  console.log(`"About to Explode" eligible products: ${aboutToExplodeProducts}`)
  
  // Sample some products to see their data
  const sampleProducts = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      name: true,
      status: true,
      price: true,
      currentScore: true,
      trendScore: true,
      daysTrending: true,
      content: {
        select: {
          id: true
        }
      }
    },
    take: 10
  })
  
  console.log('\n📦 Sample products:')
  sampleProducts.forEach(p => {
    console.log(`\n- ${p.name}`)
    console.log(`  Status: ${p.status}`)
    console.log(`  Price: $${p.price || 'null'}`)
    console.log(`  Current Score: ${p.currentScore || 'null'}`)
    console.log(`  Trend Score: ${p.trendScore}`)
    console.log(`  Days Trending: ${p.daysTrending || 'null'}`)
    console.log(`  Has Content: ${p.content ? 'YES' : 'NO'}`)
  })
  
  await prisma.$disconnect()
}

checkProducts().catch(console.error)
