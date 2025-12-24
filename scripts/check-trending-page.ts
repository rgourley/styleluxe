import { prisma } from '../lib/prisma'

async function checkTrendingPage() {
  try {
    // Check all published products with content
    const allPublished = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
    })

    console.log(`\n📊 All Published Products (with content, price >= $5 or null): ${allPublished}`)

    // Check hot filter
    const hotProducts = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        AND: [
          {
            OR: [
              { currentScore: { gte: 70 } },
              {
                AND: [
                  { currentScore: null },
                  { trendScore: { gte: 70 } },
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
    })

    console.log(`  Hot (score >= 70): ${hotProducts}`)

    // Check rising filter
    const risingProducts = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        AND: [
          {
            OR: [
              {
                AND: [
                  { currentScore: { gte: 50, lte: 69 } },
                ],
              },
              {
                AND: [
                  { currentScore: null },
                  { trendScore: { gte: 50, lte: 69 } },
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
    })

    console.log(`  Rising (score 50-69): ${risingProducts}`)

    // Check products without currentScore
    const withoutCurrentScore = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        currentScore: null,
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
    })

    console.log(`  Without currentScore (will use trendScore): ${withoutCurrentScore}`)

    // Sample products
    const sample = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
      select: {
        id: true,
        name: true,
        currentScore: true,
        trendScore: true,
        price: true,
        content: {
          select: {
            slug: true,
          },
        },
      },
      take: 10,
    })

    console.log(`\n📦 Sample Products:`)
    sample.forEach((p) => {
      const score = p.currentScore ?? p.trendScore ?? 0
      console.log(`  - ${p.name}`)
      console.log(`    Score: ${score} (currentScore: ${p.currentScore ?? 'null'}, trendScore: ${p.trendScore}), price: ${p.price ?? 'null'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTrendingPage()

