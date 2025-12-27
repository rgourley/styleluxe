import { prisma } from '../lib/prisma'

async function checkHomepageProducts() {
  try {
    // Check Trending Now products with content requirement
    const trendingNow = await prisma.product.findMany({
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
              { daysTrending: { lte: 7 } },
              { daysTrending: null },
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
        id: true,
        name: true,
        status: true,
        currentScore: true,
        trendScore: true,
        daysTrending: true,
        price: true,
        content: {
          select: {
            slug: true,
          },
        },
      },
      take: 10,
    })

    console.log(`\n📊 Trending Now Products (with content): ${trendingNow.length}`)
    trendingNow.forEach((p) => {
      console.log(`  - ${p.name}`)
      console.log(`    currentScore: ${p.currentScore ?? 'null'}, trendScore: ${p.trendScore}, daysTrending: ${p.daysTrending ?? 'null'}, price: ${p.price ?? 'null'}, hasContent: ${p.content ? 'Yes' : 'No'}`)
    })

    // Check About to Explode
    const aboutToExplode = await prisma.product.findMany({
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
                  {
                    OR: [
                      { daysTrending: { lte: 7 } },
                      { daysTrending: null },
                    ],
                  },
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
            NOT: {
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
        id: true,
        name: true,
        currentScore: true,
        trendScore: true,
        daysTrending: true,
        price: true,
        content: {
          select: {
            slug: true,
          },
        },
      },
      take: 10,
    })

    console.log(`\n📊 About to Explode Products (with content): ${aboutToExplode.length}`)
    aboutToExplode.forEach((p) => {
      console.log(`  - ${p.name}`)
      console.log(`    currentScore: ${p.currentScore ?? 'null'}, trendScore: ${p.trendScore}, daysTrending: ${p.daysTrending ?? 'null'}, price: ${p.price ?? 'null'}, hasContent: ${p.content ? 'Yes' : 'No'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHomepageProducts()


