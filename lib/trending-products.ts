import { prisma } from './prisma'
import { calculateCurrentScore, calculateDaysTrending, updatePeakScore } from './age-decay'
import { unstable_cache, revalidateTag } from 'next/cache'
import { ensureSchemaSynced } from './auto-sync-schema'

/**
 * NEW HOMEPAGE SECTIONS
 */

/**
 * Section 1: "Trending Now"
 * Query: current_score >= 70 AND days_trending <= 7
 * Limit: 8 products
 * Sort: current_score DESC
 */
export async function getTrendingNowHomepage(limit: number = 8) {
  const cachedFn = unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      // Ensure schema is synced before querying
      await ensureSchemaSynced().catch(() => {
        // Non-critical, continue even if sync fails
      })

      try {
        // Get products with currentScore >= 70 OR (currentScore is null AND trendScore >= 70)
        // Also include products with daysTrending <= 7 OR daysTrending is null
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content to show on homepage
              },
              AND: [
                {
                  OR: [
                    { currentScore: { gte: 60 } }, // Lowered from 70 to 60
                    {
                      AND: [
                        { currentScore: null },
                        { trendScore: { gte: 60 } }, // Lowered from 70 to 60
                      ],
                    },
                    // Fallback: include products with any score if they have content
                    {
                      currentScore: null,
                    },
                  ],
                },
                {
                  OR: [
                    { daysTrending: { lte: 14 } }, // Extended from 7 to 14 days
                    { daysTrending: null },
                    // Allow products up to 21 days if they have high scores
                    {
                      AND: [
                        { daysTrending: { lte: 21 } },
                        {
                          OR: [
                            { currentScore: { gte: 70 } },
                            { trendScore: { gte: 70 } },
                          ],
                        },
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
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            orderBy: [
              {
                currentScore: 'desc',
              },
              {
                trendScore: 'desc', // Fallback to trendScore if currentScore is null
              },
            ],
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 5000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getTrendingNowHomepage:', error)
        return []
      }
    },
    ['trending-now-homepage-v2'],
    {
      revalidate: 10, // Reduced from 60 to 10 seconds for faster updates
      tags: ['products', 'trending'],
    }
  )
  
  return cachedFn()
}

/**
 * Section 2: "About to Explode"
 * Query: (current_score BETWEEN 50 AND 69 AND days_trending <= 7) OR (early_signal = true AND days_trending <= 7)
 * Limit: 6 products
 * Sort: current_score DESC
 */
export async function getAboutToExplodeProducts(limit: number = 6) {
  const cachedFn = unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        // Query products with currentScore 50-69 OR early signals OR new products (score < 50 but daysTrending <= 7)
        // Use separate queries and combine for better performance
        const [scoreProducts, earlySignalProducts, newProducts] = await Promise.all([
          // Products with score 50-69 (higher priority)
          // Exclude products in Section 1 (currentScore >= 70 OR trendScore >= 70)
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
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
                // Exclude products that belong in Section 1
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
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            orderBy: {
              currentScore: 'desc',
            },
            take: limit * 2,
          }),
          // Products with early signals
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              AND: [
                {
                  OR: [
                    { daysTrending: { lte: 7 } },
                    { daysTrending: null },
                  ],
                },
                {
                  trendSignals: {
                    some: {
                      signalType: 'early_signal',
                    },
                  },
                },
                // Exclude products in Section 1 or already in score 50-69 range
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
                      { currentScore: { gte: 50, lte: 69 } },
                      {
                        AND: [
                          { currentScore: null },
                          { trendScore: { gte: 50, lte: 69 } },
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
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            orderBy: {
              currentScore: 'desc',
            },
            take: limit * 2,
          }),
          // New products with lower scores (score < 50 OR null, daysTrending <= 7 OR null, not in Section 1)
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              AND: [
                // Include products with daysTrending <= 7 OR null
                {
                  OR: [
                    { daysTrending: { lte: 7 } },
                    { daysTrending: null },
                  ],
                },
                // Include products with score < 50 OR null currentScore
                {
                  OR: [
                    {
                      currentScore: {
                        lt: 50,
                        gte: 10, // Minimum threshold
                      },
                    },
                    {
                      AND: [
                        { currentScore: null },
                        {
                          OR: [
                            { trendScore: { gte: 10, lt: 50 } },
                            { trendScore: { gte: 10 } },
                          ],
                        },
                      ],
                    },
                  ],
                },
                // Exclude products in Section 1
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
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            // Sort by currentScore desc (nulls will be last)
            orderBy: {
              currentScore: 'desc',
            },
            take: limit * 2, // Get more to account for deduplication
          }),
        ])

        // Combine and deduplicate by product ID
        const productMap = new Map()
        // Add in priority order: score 50-69 first, then early signals, then new products
        for (const product of [...scoreProducts, ...earlySignalProducts, ...newProducts]) {
          if (!productMap.has(product.id)) {
            productMap.set(product.id, product)
          }
        }

        // Sort by currentScore (higher first), fallback to trendScore, and take limit
        // This ensures score 50-69 products appear first, then early signals, then new products
        const sorted = Array.from(productMap.values())
          .sort((a, b) => {
            const scoreA = a.currentScore ?? a.trendScore ?? 0
            const scoreB = b.currentScore ?? b.trendScore ?? 0
            return scoreB - scoreA
          })
          .slice(0, limit)

        return sorted
      } catch (error) {
        console.error('❌ Database error in getAboutToExplodeProducts:', error)
        return []
      }
    },
    ['about-to-explode-products'],
    {
      revalidate: 10, // Reduced from 60 to 10 seconds for faster updates
      tags: ['products', 'rising'],
    }
  )
  
  return cachedFn()
}

/**
 * Section 3: "Recently Hot"
 * Query: days_trending BETWEEN 8 AND 30 AND peak_score >= 70
 * This shows products that peaked high (70+) and were trending 8-30 days ago (older, not currently hot)
 * Limit: 6 products
 * Sort: peak_score DESC
 */
export async function getRecentlyHotProducts(limit: number = 6) {
  const cachedFn = unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              AND: [
                {
                  OR: [
                    { peakScore: { gte: 60 } }, // Lowered from 70 to 60
                    { currentScore: { gte: 60 } }, // Lowered from 70 to 60
                    {
                      AND: [
                        { peakScore: null },
                        { currentScore: null },
                        { trendScore: { gte: 60 } }, // Lowered from 70 to 60
                      ],
                    },
                  ],
                },
                // Products that are older (7-45 days) - not currently trending
                // Also include products with daysTrending null (fallback)
                {
                  OR: [
                    {
                      daysTrending: {
                        gte: 7, // Lowered from 8 to 7
                        lte: 45, // Extended from 30 to 45
                      },
                    },
                    {
                      AND: [
                        { daysTrending: null },
                        {
                          createdAt: {
                            lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Created at least 7 days ago
                          },
                        },
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
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            orderBy: [
              {
                peakScore: 'desc',
              },
              {
                currentScore: 'desc', // Fallback
              },
              {
                trendScore: 'desc', // Fallback
              },
            ],
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getRecentlyHotProducts:', error)
        return []
      }
    },
    ['recently-hot-products'],
    {
      revalidate: 10, // Reduced from 60 to 10 seconds for faster updates
      tags: ['products', 'recent'],
    }
  )
  
  return cachedFn()
}

/**
 * Get products for "Trending Now" section (past 7 days, sorted by current_score)
 * Cached for 60 seconds to improve performance
 */
export async function getTrendingNowProducts(limit: number = 10) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not configured. Returning empty products list.')
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED', // Only show explicitly published products
              // Days trending <= 7
              daysTrending: {
                lte: 7,
              },
              // Current score >= 40 (after decay)
              currentScore: {
                gte: 40,
              },
              // Price >= $5 OR null (allow products without price set)
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: {
              currentScore: 'desc',
            },
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getTrendingNowProducts:', error)
        return []
      }
    },
    ['trending-now-products'],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: ['products', 'trending'],
    }
  )()
}

/**
 * Get products for "Recent Trends" section (8-30 days, sorted by peak_score)
 * Cached for 60 seconds
 */
export async function getRecentTrendsProducts(limit: number = 12) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not configured. Returning empty products list.')
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED', // Only show explicitly published products
              // Days trending between 8 and 30
              daysTrending: {
                gte: 8,
                lte: 30,
              },
              // Peak score >= 40 (they had a moment)
              peakScore: {
                gte: 40,
              },
              // Price >= $5 OR null (allow products without price set)
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: {
              peakScore: 'desc',
            },
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getRecentTrendsProducts:', error)
        return []
      }
    },
    ['recent-trends-products'],
    {
      revalidate: 60,
      tags: ['products', 'recent'],
    }
  )()
}

/**
 * Recalculate age decay scores for all products
 * This should be run daily to update current scores
 */
export async function recalculateAllScores() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not configured. Cannot recalculate scores.')
    return { updated: 0, errors: 0 }
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        firstDetected: {
          not: null,
        },
  },
      select: {
        id: true,
        baseScore: true,
        firstDetected: true,
        peakScore: true,
        onMoversShakers: true,
        lastSeenOnMoversShakers: true,
        createdAt: true, // Include createdAt for trending calculation
        // Note: pageViews and clicks are not selected here to avoid errors if columns don't exist
        // They will be null in calculateCurrentScore calls
  },
    })

    let updated = 0
    let errors = 0

    for (const product of products) {
  try {
        // Check if product dropped off M&S (was on M&S but now off)
        const droppedOffMS = product.onMoversShakers === false && 
                             product.lastSeenOnMoversShakers !== null
        
        const result = calculateCurrentScore(
          product.baseScore, 
          product.firstDetected,
          // @ts-ignore - pageViews and clicks will be available after migration
          product.pageViews,
          // @ts-ignore
          product.clicks,
          droppedOffMS,
          product.createdAt || product.firstDetected // Use createdAt for trending calculation, fallback to firstDetected
        )
        const newPeakScore = updatePeakScore(result.currentScore, product.peakScore)

        await prisma.product.update({
          where: { id: product.id },
          data: {
            currentScore: result.currentScore,
            daysTrending: result.daysTrending,
            peakScore: newPeakScore,
            lastUpdated: new Date(),
          },
        })
        
        // Cache invalidation is handled via API endpoint in scripts
        // revalidateTag requires 2 args in Next.js 16, so we skip it here

        updated++
  } catch (error) {
    console.error(`Error updating product ${product.id}:`, error)
        errors++
  }
    }

    return { updated, errors }
  } catch (error) {
    console.error('❌ Database error in recalculateAllScores:', error)
    return { updated: 0, errors: 0 }
  }
}

/**
 * Get "Peak Viral" products (currentScore >= 80)
 * Cached for 60 seconds
 */
export async function getPeakViralProducts(limit: number = 8) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED', // Only show explicitly published products
              currentScore: {
                gte: 80,
              },
              daysTrending: {
                lte: 30, // Still within 30 days
              },
              // Price >= $5 OR null (allow products without price set)
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: {
              currentScore: 'desc',
            },
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getPeakViralProducts:', error)
        return []
      }
    },
    ['peak-viral-products'],
    {
      revalidate: 60,
      tags: ['products', 'peak-viral'],
    }
  )()
}

/**
 * Get most recent trending products - products that were most recently published
 * Ordered by publishedAt date (most recent first)
 * Cached for 60 seconds
 */
export async function getMostRecentTrendingProducts(limit: number = 4) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              publishedAt: {
                not: null, // Must have been published
              },
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 3,
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
            orderBy: {
              publishedAt: 'desc', // Most recently published first
            },
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getMostRecentTrendingProducts:', error)
        return []
      }
    },
    ['most-recent-trending-products-v1'],
    {
      revalidate: 10, // 10 seconds for faster updates
      tags: ['products', 'trending', 'new'],
    }
  )()
}

/**
 * Get products popular on Reddit
 * Shows products with high redditHotness (>= 3) OR multiple Reddit mentions
 * Ordered by redditHotness (desc) and then by number of Reddit signals
 */
export async function getRedditPopularProducts(limit: number = 4) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      await ensureSchemaSynced().catch(() => {})

      try {
        // First, get all published products with content
        const allProducts = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                where: {
                  source: 'reddit_skincare', // Only count Reddit signals
                },
                orderBy: {
                  detectedAt: 'desc',
                },
              },
              reviews: {
                take: 5,
              },
              content: true,
            },
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 5000)
          )
        ])

        // Filter and score products based on Reddit popularity
        const scoredProducts = allProducts
          .map(product => {
            const redditHotness = (product.content?.redditHotness as number) || 0
            const redditSignalCount = product.trendSignals?.length || 0
            
            // Include products with:
            // 1. High redditHotness (>= 3), OR
            // 2. Multiple Reddit mentions (>= 2 signals)
            if (redditHotness >= 3 || redditSignalCount >= 2) {
              return {
                product,
                score: redditHotness * 10 + redditSignalCount, // Prioritize redditHotness, then signal count
                redditHotness,
                redditSignalCount,
              }
            }
            return null
          })
          .filter((item): item is { product: any; score: number; redditHotness: number; redditSignalCount: number } => item !== null)
          .sort((a, b) => {
            // Sort by redditHotness first (desc), then by signal count (desc)
            if (b.redditHotness !== a.redditHotness) {
              return b.redditHotness - a.redditHotness
            }
            return b.redditSignalCount - a.redditSignalCount
          })
          .slice(0, limit)
          .map(item => item.product)

        return scoredProducts
      } catch (error) {
        console.error('❌ Database error in getRedditPopularProducts:', error)
        return []
      }
    },
    ['reddit-popular-products-v1'],
    {
      revalidate: 10, // 10 seconds for faster updates
      tags: ['products', 'reddit', 'trending'],
    }
  )()
}

/**
 * Get "New This Week" products - simply the most recently added products
 * Ordered by creation date, regardless of trending status
 * Cached for 60 seconds
 */
export async function getNewThisWeekProducts(limit: number = 8) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        // Get products added in the last 7 days
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED', // Only show explicitly published products
              // Products created in the last 7 days
              createdAt: {
                gte: oneWeekAgo,
              },
              // Price >= $5 OR null (allow products without price set)
              OR: [
                { price: { gte: 5 } },
                { price: null },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: {
              createdAt: 'desc', // Most recently added first
            },
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getNewThisWeekProducts:', error)
        return []
      }
    },
    ['new-this-week-products'],
    {
      revalidate: 60,
      tags: ['products', 'new'],
    }
  )()
}

/**
 * Get "Rising Fast" products - Reddit buzz products NOT on Amazon Movers & Shakers
 * These are products with strong Reddit engagement but not (yet) on Amazon M&S
 * Score range: 40-69 points (below "Trending Now" threshold of 70)
 * Cached for 60 seconds
 */
export async function getRisingFastProducts(limit: number = 8) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        // Get products with Reddit signals but NO Amazon M&S signals
        // OR products that dropped out of "Trending Now" (score 40-69)
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED',
              content: {
                isNot: null, // Must have content
              },
              AND: [
                {
                  // Score range: 40-69 (below "Trending Now" but still trending)
                  OR: [
                    {
                      AND: [
                        { currentScore: { gte: 40, lt: 70 } },
                        { daysTrending: { lte: 14 } }, // Within 2 weeks
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
                  // Price >= $5 OR null
                  OR: [
                    { price: { gte: 5 } },
                    { price: null },
                  ],
                },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: [
              {
                currentScore: 'desc',
              },
              {
                trendScore: 'desc',
              },
            ],
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getRisingFastProducts:', error)
        return []
      }
    },
    ['rising-fast-products-v3'], // Updated cache key to force refresh on live site
    {
      revalidate: 10, // Reduced from 60 to 10 seconds for faster cache updates
      tags: ['products', 'rising'],
    }
  )()
}

/**
 * Get products by category
 */
export async function getProductsByCategory(category: string, limit: number = 12) {
  if (!process.env.DATABASE_URL) {
    return []
  }

  try {
    const products = await Promise.race([
      prisma.product.findMany({
        where: {
          status: {
            equals: 'PUBLISHED', // Only show explicitly published products
          },
          category: {
            equals: category,
            mode: 'insensitive',
          },
          currentScore: {
            gte: 30,
          },
          daysTrending: {
            lte: 30,
          },
          // Price >= $5 (exclude products under $5)
          price: {
            gte: 5,
          },
        },
        include: {
          trendSignals: {
        orderBy: {
              detectedAt: 'desc',
            },
        take: 5,
          },
          reviews: {
        take: 10,
          },
          content: true,
        },
        orderBy: {
          currentScore: 'desc',
        },
        take: limit,
  }),
      new Promise<any[]>((resolve) => 
        setTimeout(() => {
          console.warn('⚠️  Database query timeout - returning empty array')
          resolve([])
        }, 3000)
      )
    ])

    return products
  } catch (error) {
    console.error('❌ Database error in getProductsByCategory:', error)
    return []
  }
}

/**
 * Get products for "Warming Up" section (low trend scores, early signals)
 * Cached for 60 seconds
 */
export async function getWarmingUpProducts(limit: number = 8) {
  return unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not configured. Returning empty products list.')
        return []
      }

      try {
        const products = await Promise.race([
          prisma.product.findMany({
            where: {
              status: 'PUBLISHED', // Only show explicitly published products
              AND: [
                // Low trend scores (warming up, not yet hot)
                {
                  OR: [
                    {
                      currentScore: {
                        gte: 10,
                        lt: 40, // Below trending threshold
                      },
                    },
                    {
                      trendScore: {
                        gte: 10,
                        lt: 40, // Fallback to legacy trendScore
                      },
                      currentScore: null, // If currentScore not set yet
                    },
                  ],
                },
                // Price >= $5 OR null (allow products without price set)
                {
                  OR: [
                    { price: { gte: 5 } },
                    { price: null },
                  ],
                },
              ],
            },
            include: {
              trendSignals: {
                orderBy: {
                  detectedAt: 'desc',
                },
                take: 5,
              },
              reviews: {
                take: 10,
              },
              content: true,
            },
            orderBy: [
              {
                currentScore: 'desc',
              },
              {
                trendScore: 'desc', // Fallback
              },
            ],
            take: limit,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        return products
      } catch (error) {
        console.error('❌ Database error in getWarmingUpProducts:', error)
        return []
      }
    },
    ['warming-up-products'],
    {
      revalidate: 60,
      tags: ['products', 'warming'],
    }
  )()
}

/**
 * Search products by name or brand
 */
export async function searchProducts(query: string, limit: number = 20) {
  if (!process.env.DATABASE_URL || !query || query.trim().length === 0) {
    return []
  }

  try {
    const searchTerm = query.trim()
    
    const products = await Promise.race([
      prisma.product.findMany({
        where: {
          status: 'PUBLISHED', // Only show explicitly published products
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              brand: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
          // Price >= $5 (exclude products under $5)
          price: {
            gte: 5,
          },
        },
        include: {
          trendSignals: {
        orderBy: {
              detectedAt: 'desc',
            },
        take: 5,
          },
          reviews: {
        take: 10,
          },
          content: true,
        },
        orderBy: {
          currentScore: 'desc',
        },
        take: limit,
  }),
      new Promise<any[]>((resolve) => 
        setTimeout(() => {
          console.warn('⚠️  Database query timeout - returning empty array')
          resolve([])
        }, 3000)
      )
    ])

    return products
  } catch (error) {
    console.error('❌ Database error in searchProducts:', error)
    return []
  }
}

/**
 * Set first_detected for a new product (when it first appears in trending data)
 */
/**
 * Add small random variation to score to avoid all products having identical scores
 * Adds 1-5 points variation (can be negative)
 */
function addScoreVariation(score: number): number {
  const variation = Math.floor(Math.random() * 5) - 2 // -2 to +2 (5 possible values: -2, -1, 0, 1, 2)
  const adjusted = score + variation
  // Clamp to valid range (0-100)
  return Math.max(0, Math.min(100, adjusted))
}

export async function setFirstDetected(productId: string, baseScore: number) {
  if (!process.env.DATABASE_URL) {
    return
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { 
        firstDetected: true, 
        baseScore: true,
        onMoversShakers: true,
        lastSeenOnMoversShakers: true,
        createdAt: true, // Include createdAt for trending calculation
        peakScore: true, // Include peakScore for updatePeakScore
        metadata: {
          select: {
            starRating: true,
            totalReviewCount: true,
          },
        },
      },
    })
    
    // Apply review-based adjustments to baseScore if we have review data
    let adjustedBaseScore = baseScore
    if (product?.metadata?.starRating) {
      const { calculateCombinedReviewAdjustment } = await import('./review-scoring')
      const reviewAdjustment = calculateCombinedReviewAdjustment(
        product.metadata.starRating,
        product.metadata.totalReviewCount
      )
      adjustedBaseScore = baseScore + reviewAdjustment
      // Cap at 100, floor at 70 (don't go too low for M&S products)
      adjustedBaseScore = Math.min(100, Math.max(70, adjustedBaseScore))
    }

    // pageViews and clicks are not available until migration is run
    // Use null values - they'll be handled gracefully in calculateCurrentScore
    const pageViews: number | null = null
    const clicks: number | null = null

    // Check if product dropped off M&S (was on M&S but now off)
    const droppedOffMS = product?.onMoversShakers === false && 
                         product?.lastSeenOnMoversShakers !== null

    // Only set firstDetected if it's not already set (new product)
    if (!product?.firstDetected) {
      // Add small random variation to adjustedBaseScore for new products (1-5 points variation)
      const variedBaseScore = addScoreVariation(adjustedBaseScore)
      
      const result = calculateCurrentScore(
        variedBaseScore, 
        null,
        pageViews,
        clicks,
        false, // New products haven't dropped off M&S yet
        product?.createdAt || new Date() // Use createdAt for trending calculation
      )
      
      await prisma.product.update({
        where: { id: productId },
        data: {
          firstDetected: new Date(),
          baseScore: variedBaseScore,
          currentScore: result.currentScore,
          daysTrending: 0,
          peakScore: variedBaseScore,
          lastUpdated: new Date(),
        },
      })
    } else {
      // Update existing product's base score and recalculate
      // If product was already on M&S and coming back, don't reset baseScore
      // Instead, only update if the new baseScore is higher (boost) or if it dropped off M&S
      const currentBaseScore = product.baseScore || 0
      const finalBaseScore = droppedOffMS ? adjustedBaseScore : Math.max(currentBaseScore, adjustedBaseScore)
      
      const result = calculateCurrentScore(
        finalBaseScore, 
        product.firstDetected, // Keep original firstDetected date for M&S tracking
        pageViews,
        clicks,
        droppedOffMS,
        product?.createdAt || product.firstDetected // Use createdAt for trending calculation
      )
      const newPeakScore = updatePeakScore(result.currentScore, finalBaseScore)

      await prisma.product.update({
        where: { id: productId },
        data: {
          baseScore: finalBaseScore,
          currentScore: result.currentScore,
          daysTrending: result.daysTrending,
          peakScore: newPeakScore,
          lastUpdated: new Date(),
        },
  })
      
      // Cache invalidation is handled via API endpoint in scripts
      // revalidateTag requires 2 args in Next.js 16, so we skip it here
    }
  } catch (error) {
    console.error(`Error setting firstDetected for product ${productId}:`, error)
  }
}

