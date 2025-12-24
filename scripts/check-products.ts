import { prisma } from '../lib/prisma'

async function checkProducts() {
  try {
    // Count products by status
    const counts = await prisma.product.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    console.log('\n📊 Product Counts by Status:')
    counts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.id}`)
    })

    // Get sample products with their scores
    const sampleProducts = await prisma.product.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        trendScore: true,
        currentScore: true,
        baseScore: true,
        daysTrending: true,
        peakScore: true,
        firstDetected: true,
        price: true,
        content: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('\n📦 Sample Products:')
    sampleProducts.forEach((product) => {
      console.log(`\n  ${product.name}`)
      console.log(`    Status: ${product.status}`)
      console.log(`    Trend Score (legacy): ${product.trendScore}`)
      console.log(`    Current Score: ${product.currentScore ?? 'null'}`)
      console.log(`    Base Score: ${product.baseScore ?? 'null'}`)
      console.log(`    Days Trending: ${product.daysTrending ?? 'null'}`)
      console.log(`    Peak Score: ${product.peakScore ?? 'null'}`)
      console.log(`    First Detected: ${product.firstDetected?.toISOString() ?? 'null'}`)
      console.log(`    Price: ${product.price ?? 'null'}`)
      console.log(`    Has Content: ${product.content ? 'Yes' : 'No'}`)
    })

    // Check products that would match homepage queries
    const trendingNowCount = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        currentScore: {
          gte: 70,
        },
        daysTrending: {
          lte: 7,
        },
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
    })

    const aboutToExplodeCount = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        currentScore: {
          gte: 50,
          lte: 69,
        },
        daysTrending: {
          lte: 7,
        },
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
    })

    const recentlyHotCount = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        peakScore: {
          gte: 70,
        },
        daysTrending: {
          gte: 8,
          lte: 30,
        },
        OR: [
          { price: { gte: 5 } },
          { price: null },
        ],
      },
    })

    console.log('\n🔍 Homepage Query Results:')
    console.log(`  Trending Now (currentScore >= 70, daysTrending <= 7): ${trendingNowCount}`)
    console.log(`  About to Explode (currentScore 50-69, daysTrending <= 7): ${aboutToExplodeCount}`)
    console.log(`  Recently Hot (peakScore >= 70, daysTrending 8-30): ${recentlyHotCount}`)

    // Check products with PUBLISHED status but missing age decay fields
    const publishedWithoutScores = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        OR: [
          { currentScore: null },
          { daysTrending: null },
          { firstDetected: null },
        ],
      },
    })

    console.log(`\n⚠️  Published products missing age decay fields: ${publishedWithoutScores}`)

    // Check products with content but not published
    const withContentNotPublished = await prisma.product.count({
      where: {
        content: {
          isNot: null,
        },
        status: {
          not: 'PUBLISHED',
        },
      },
    })

    console.log(`  Products with content but not published: ${withContentNotPublished}`)

  } catch (error) {
    console.error('❌ Error checking products:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProducts()

