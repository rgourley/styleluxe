import { prisma } from './prisma'
import { unstable_cache } from 'next/cache'

// Define ProductWithRelations type based on Prisma schema
// Using a flexible type to match Prisma's return type with includes
type ProductWithRelations = {
  id: string
  name: string
  brand: string | null
  price: number | null
  currency: string
  imageUrl: string | null
  amazonUrl: string | null
  category: string | null
  trendScore: number
  status: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  trendSignals: Array<{
    id: string
    productId: string
    source: string
    signalType: string
    value: number | null
    metadata: any
    detectedAt: Date
    createdAt?: Date
  }>
  reviews: Array<{
    id: string
    productId: string
    rating: number | null
    title: string | null
    content: string | null
    author: string | null
    date: Date | null
    helpful: number | null
    verified: boolean
    scrapedAt: Date | null
    createdAt?: Date
  }>
  content: {
    id: string
    productId: string
    slug: string
    hook: string | null
    whyTrending: string | null
    whatItDoes: string | null
    theGood: string | null
    theBad: string | null
    whoShouldTry: string | null
    whoShouldSkip: string | null
    alternatives: string | null
    whatRealUsersSay: string | null
    faq: any
    editedByHuman: boolean
    generatedAt?: Date
    createdAt?: Date
    updatedAt: Date
  } | null
  metadata?: {
    id: string
    productId: string
    starRating: number | null
    totalReviewCount: number | null
    availability: string | null
    description: string | null
    keyFeatures: any
    positiveThemes: any
    negativeThemes: any
    specificDetails: any
    memorableQuotes: any
    lastScrapedAt: Date
    updatedAt: Date
  } | null
}

export async function getTrendingProducts(): Promise<ProductWithRelations[]> {
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not configured. Returning empty products list.')
    return []
  }

  try {
    // Query with timeout to prevent hanging
    return await Promise.race([
      prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
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
        trendScore: 'desc',
      },
      take: 20,
    }),
      new Promise<ProductWithRelations[]>((resolve) => 
        setTimeout(() => {
          console.warn('⚠️  Database query timeout - returning empty array')
          resolve([])
        }, 3000)
      )
    ])
  } catch (error) {
    console.error('❌ Database error in getTrendingProducts:', error)
    // Return empty array if database is not available
    return []
  } finally {
    // Don't disconnect in serverless environment
    // await prisma.$disconnect()
  }
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  return unstable_cache(
    async () => {
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not configured. Cannot fetch product.')
        return null
      }

      try {
        // Allow PUBLISHED and DRAFT products (DRAFT for preview before publishing)
        const product = await prisma.product.findFirst({
          where: {
            content: {
              slug: slug,
            },
            status: {
              in: ['PUBLISHED', 'DRAFT'], // Allow DRAFT for preview
            },
          },
          include: {
            trendSignals: {
              orderBy: {
                detectedAt: 'desc',
              },
            },
            reviews: {
              orderBy: {
                date: 'desc',
              },
            },
            content: true,
          },
        })
        
        if (!product) {
          return null
        }
        
        // Fetch metadata separately if it exists
        let metadata = null
        try {
          // @ts-ignore - ProductMetadata might not exist in Prisma client yet
          if (prisma.productMetadata) {
            // @ts-ignore
            metadata = await prisma.productMetadata.findUnique({
              where: { productId: product.id },
            })
          }
        } catch (error) {
          // Metadata table doesn't exist yet
        }
        
        return {
          ...product,
          metadata,
        }
      } catch (error) {
        console.error('❌ Database error in getProductBySlug:', error)
        return null
      }
    },
    [`product-${slug}`],
    {
      revalidate: 60, // Cache for 60 seconds (cache invalidation on publish/generate will override this)
      tags: ['products', `product-${slug}`],
    }
  )()
}

// Utility functions moved to lib/product-utils.ts to avoid Prisma imports in client components
export { getTrendEmoji, getTrendLabel, formatTrendDuration, getSalesSpikePercent } from './product-utils'
