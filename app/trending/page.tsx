import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { unstable_cache } from 'next/cache'

// Content select that excludes previousSlugs (which may not exist in production yet)
const contentSelect = {
  id: true,
  productId: true,
  slug: true,
  hook: true,
  whyTrending: true,
  whatItDoes: true,
  theGood: true,
  theBad: true,
  whoShouldTry: true,
  whoShouldSkip: true,
  alternatives: true,
  whatRealUsersSay: true,
  faq: true,
  editorNotes: true,
  redditHotness: true,
  googleTrendsData: true,
  editedByHuman: true,
  generatedAt: true,
  updatedAt: true,
  // previousSlugs excluded - will be available after migration
}

// Revalidate every 60 seconds
export const revalidate = 60

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata = {
  title: "All Trending Beauty Products - Filter by Hot, Rising, Recent",
  description: "Browse all trending beauty products. Filter by hot products (70+), rising products (50-69), or recent trends. Discover what's going viral on TikTok, Instagram, Reddit, and Amazon.",
  alternates: {
    canonical: `${siteUrl}/trending`,
  },
}

async function getFilteredProducts(filter: string, category?: string | null, searchQuery?: string | null) {
  const cachedFn = unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        // Build base where conditions
        const baseConditions: any[] = [
          { status: 'PUBLISHED' },
          { content: { isNot: null } }, // Must have content to show
          {
            OR: [
              { price: { gte: 5 } },
              { price: null },
            ],
          },
        ]

        // Add category filter if provided
        if (category) {
          baseConditions.push({ category })
        }

        // Add search filter if provided
        if (searchQuery) {
          baseConditions.push({
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { brand: { contains: searchQuery, mode: 'insensitive' } },
            ],
          })
        }

        // Apply filter-specific conditions
        switch (filter) {
          case 'hot':
            // currentScore >= 70 OR (currentScore is null AND trendScore >= 70)
            baseConditions.push({
              OR: [
                { currentScore: { gte: 70 } },
                {
                  AND: [
                    { currentScore: null },
                    { trendScore: { gte: 70 } },
                  ],
                },
              ],
            })
            break
          case 'rising':
            // currentScore 50-69 OR (currentScore is null AND trendScore 50-69)
            baseConditions.push({
              OR: [
                { currentScore: { gte: 50, lte: 69 } },
                {
                  AND: [
                    { currentScore: null },
                    { trendScore: { gte: 50, lte: 69 } },
                  ],
                },
              ],
            })
            break
          case 'recent':
            // daysTrending <= 7 (recently trending) OR (daysTrending is null AND recently created)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            
            baseConditions.push({
              OR: [
                { daysTrending: { lte: 7 } }, // Trending within last 7 days
                {
                  AND: [
                    { daysTrending: null },
                    {
                      createdAt: {
                        gte: sevenDaysAgo, // Created within last 7 days
                      },
                    },
                  ],
                },
              ],
            })
            break
          case 'all':
          default:
            // Show all published products with content (no score filter)
            break
        }

        // Build final where clause with all conditions in AND
        const where: any = {
          AND: baseConditions,
        }

        const products = await Promise.race([
          prisma.product.findMany({
            where,
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
              content: {
                select: contentSelect,
              },
            },
            orderBy: filter === 'recent' 
              ? [
                  { peakScore: 'desc' },
                  { currentScore: 'desc' },
                  { trendScore: 'desc' },
                ]
              : [
                  { currentScore: 'desc' },
                  { trendScore: 'desc' }, // Fallback to trendScore if currentScore is null
                ],
            take: 50,
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
        console.error('❌ Database error in getFilteredProducts:', error)
        return []
      }
    },
    [`trending-${filter}-${category || 'all'}-${searchQuery || 'none'}`],
    {
      revalidate: 60,
      tags: ['products', 'trending', filter],
    }
  )
  
  return cachedFn()
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; category?: string; q?: string }>
}) {
  const params = await searchParams
  const activeFilter = params.filter || 'all'
  const category = params.category
  const searchQuery = params.q

  const products = await getFilteredProducts(activeFilter, category, searchQuery)

  const filters = [
    { id: 'all', label: 'All', description: 'All products' },
    { id: 'hot', label: 'Hot', description: 'Score 70+' },
    { id: 'rising', label: 'Rising', description: 'Score 50-69' },
    { id: 'recent', label: 'Recent', description: 'Days trending > 7' },
  ]

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            All Trending Products
          </h1>
          <p className="text-lg text-[#6b6b6b] max-w-[920px]">
            Browse all trending beauty products. Filter by hot products, rising products, or recent trends.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 border-b border-[#e5e5e5]">
          <div className="flex flex-wrap gap-2 md:gap-4">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id
              return (
                <Link
                  key={filter.id}
                  href={`/trending?filter=${filter.id}`}
                  className={`
                    px-4 py-2 text-sm font-medium transition-colors border-b-2
                    ${isActive
                      ? 'border-[#FF6B6B] text-[#FF6B6B]'
                      : 'border-transparent text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] hover:border-[#d5d5d5]'
                    }
                  `}
                >
                  {filter.label}
                  <span className="ml-2 text-xs text-[#8b8b8b]">({filter.description})</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[#6b6b6b] text-lg mb-4">
              No products found for this filter.
            </p>
            <Link 
              href="/trending?filter=all" 
              className="text-[#FF6B6B] hover:text-[#E07856] underline"
            >
              View all products
            </Link>
          </div>
        )}

        {/* Results Count */}
        {products.length > 0 && (
          <div className="mt-12 text-center text-sm text-[#6b6b6b]">
            Showing {products.length} {products.length === 1 ? 'product' : 'products'}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

