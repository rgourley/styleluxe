import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { unstable_cache } from 'next/cache'

// Revalidate every 10 seconds (reduced for faster cache updates)
export const revalidate = 10

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'

export const metadata = {
  title: "All Trending Beauty Products - Filter by Hot, Rising, Recent",
  description: "Browse all trending beauty products. Filter by hot products (70+), rising products (50-69), or recent trends. Discover what's going viral on TikTok, Instagram, Reddit, and Amazon.",
  alternates: {
    canonical: `${siteUrl}/trending`,
  },
}

async function getFilteredProducts(filter: string, category?: string | null, searchQuery?: string | null, page: number = 1, pageSize: number = 48) {
  const cachedFn = unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize
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
            // Show all published products with content (including zero scores)
            // No score filter - will be sorted by score descending (zero scores at bottom)
            break
        }

        // Build final where clause with all conditions in AND
        const where: any = {
          AND: baseConditions,
        }

        // Fetch one extra product to check if there are more pages
        const productsWithExtra = await Promise.race([
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
              content: true,
            },
            orderBy: filter === 'recent' 
              ? [
                  { peakScore: 'desc' },
                  { currentScore: 'desc' }, // Zero scores at bottom (0 < any positive number)
                  { trendScore: 'desc' },
                ]
              : [
                  { currentScore: 'desc' }, // Zero scores at bottom (0 < any positive number)
                  { trendScore: 'desc' }, // Fallback to trendScore if currentScore is null
                ],
            skip: skip,
            take: pageSize + 1, // Fetch one extra to check for next page
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        // Check if there are more products (we fetched pageSize + 1)
        // productsWithExtra is an array from the Promise.race
        const productsArray = Array.isArray(productsWithExtra) ? productsWithExtra : []
        const hasMore = productsArray.length > pageSize
        const products = productsArray.slice(0, pageSize) // Return only the requested amount
        
        console.log(`✅ Found ${products.length} products for filter "${filter}"${hasMore ? ' (more available)' : ''}`)
        return { products, hasMore }
      } catch (error) {
        console.error(`❌ Database error in getFilteredProducts (filter: ${filter}):`, error)
        // Log the error details for debugging
        if (error instanceof Error) {
          console.error('Error message:', error.message)
          console.error('Error stack:', error.stack)
        }
        return { products: [], hasMore: false }
      }
    },
    [`trending-${filter}-${category || 'all'}-${searchQuery || 'none'}-page-${page}-v2`], // Include page in cache key
    {
      revalidate: 10, // Reduced from 60 to 10 seconds for faster updates
      tags: ['products', 'trending', filter],
    }
  )
  
  return cachedFn()
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; category?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeFilter = params.filter || 'all'
  const category = params.category
  const searchQuery = params.q
  const page = parseInt(params.page || '1', 10)
  const pageSize = 48 // Increased from 24 to show more products per page

  const result = await getFilteredProducts(activeFilter, category, searchQuery, page, pageSize)
  // Handle both array and object return types
  const products = Array.isArray(result) ? result : (result?.products || [])
  const hasMore = Array.isArray(result) ? false : (result?.hasMore || false)

  const filters = [
    { id: 'all', label: 'All', description: 'All products' },
    { id: 'hot', label: 'Hot', description: 'Score 70+' },
    { id: 'rising', label: 'Rising', description: 'Score 50-69' },
    { id: 'recent', label: 'Recent', description: 'Days trending ≤ 7' },
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
                  href={`/trending?filter=${filter.id}${category ? `&category=${encodeURIComponent(category)}` : ''}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&page=1`}
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

        {/* Load More / Pagination */}
        {products.length > 0 && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="text-sm text-[#6b6b6b]">
              Showing {((page - 1) * pageSize) + 1}-{((page - 1) * pageSize) + products.length} products
            </div>
            {hasMore && (
              <Link
                href={`/trending?filter=${activeFilter}${category ? `&category=${encodeURIComponent(category)}` : ''}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&page=${page + 1}`}
                className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#E07856] text-white font-medium rounded-lg transition-colors"
              >
                Load More Products
              </Link>
            )}
            {page > 1 && (
              <Link
                href={`/trending?filter=${activeFilter}${category ? `&category=${encodeURIComponent(category)}` : ''}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${page > 2 ? `&page=${page - 1}` : ''}`}
                className="text-sm text-[#6b6b6b] hover:text-[#FF6B6B] transition-colors"
              >
                ← Previous Page
              </Link>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

