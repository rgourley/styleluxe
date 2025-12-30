import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { unstable_cache } from 'next/cache'
import { getCategoryMetadata, getCategoryName, categoryMetadata } from '@/lib/category-metadata'
import { notFound } from 'next/navigation'

// Revalidate every 10 seconds
export const revalidate = 10

// Generate static params for all categories
export async function generateStaticParams() {
  return Object.keys(categoryMetadata).map((slug) => ({
    category: slug,
  }))
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const metadata = getCategoryMetadata(categorySlug)
  
  if (!metadata) {
    return {
      title: 'Category Not Found',
    }
  }

  return {
    title: metadata.seoTitle,
    description: metadata.seoDescription,
    alternates: {
      canonical: `${siteUrl}/trending/${categorySlug}`,
    },
    openGraph: {
      title: metadata.seoTitle,
      description: metadata.seoDescription,
      url: `${siteUrl}/trending/${categorySlug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.seoTitle,
      description: metadata.seoDescription,
    },
  }
}

async function getFilteredProducts(filter: string, category: string, searchQuery?: string | null, page: number = 1, pageSize: number = 48) {
  const cachedFn = unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        // Get the database category name from slug
        const dbCategoryName = getCategoryName(category)
        if (!dbCategoryName) {
          return { products: [], hasMore: false }
        }

        // Build base where conditions
        const baseConditions: any[] = [
          { status: 'PUBLISHED' },
          { content: { isNot: null } }, // Must have content to show
          { category: dbCategoryName }, // Filter by category
          {
            OR: [
              { price: { gte: 5 } },
              { price: null },
            ],
          },
        ]

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
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            
            baseConditions.push({
              OR: [
                { daysTrending: { lte: 7 } },
                {
                  AND: [
                    { daysTrending: null },
                    {
                      createdAt: {
                        gte: sevenDaysAgo,
                      },
                    },
                  ],
                },
              ],
            })
            break
          case 'all':
          default:
            // Show all products in category
            break
        }

        // Build final where clause
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
                  { currentScore: 'desc' },
                  { trendScore: 'desc' },
                ]
              : [
                  { currentScore: 'desc' },
                  { trendScore: 'desc' },
                ],
            skip: skip,
            take: pageSize + 1,
          }),
          new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('⚠️  Database query timeout - returning empty array')
              resolve([])
            }, 3000)
          )
        ])

        const productsArray = Array.isArray(productsWithExtra) ? productsWithExtra : []
        const hasMore = productsArray.length > pageSize
        const products = productsArray.slice(0, pageSize)
        
        return { products, hasMore }
      } catch (error) {
        console.error(`❌ Database error in getFilteredProducts (category: ${category}):`, error)
        return { products: [], hasMore: false }
      }
    },
    [`trending-category-${category}-${filter}-${searchQuery || 'none'}-page-${page}-v1`],
    {
      revalidate: 10,
      tags: ['products', 'trending', category, filter],
    }
  )
  
  return cachedFn()
}

export default async function CategoryTrendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>
}) {
  const { category: categorySlug } = await params
  const params2 = await searchParams
  const activeFilter = params2.filter || 'all'
  const searchQuery = params2.q
  const page = parseInt(params2.page || '1', 10)
  const pageSize = 48

  // Get category metadata
  const categoryMeta = getCategoryMetadata(categorySlug)
  if (!categoryMeta) {
    notFound()
  }

  const result = await getFilteredProducts(activeFilter, categorySlug, searchQuery, page, pageSize)
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
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            {categoryMeta.title}
          </h1>
          <p className="text-lg text-[#6b6b6b] max-w-[920px] mb-2">
            {categoryMeta.description}
          </p>
          <p className="text-base text-[#8b8b8b] max-w-[920px]">
            {categoryMeta.subhead}
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
                  href={`/trending/${categorySlug}?filter=${filter.id}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&page=1`}
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
              No products found in this category.
            </p>
            <Link 
              href={`/trending/${categorySlug}?filter=all`}
              className="text-[#FF6B6B] hover:text-[#E07856] underline"
            >
              View all {categoryMeta.title.toLowerCase()}
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
                href={`/trending/${categorySlug}?filter=${activeFilter}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}&page=${page + 1}`}
                className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#E07856] text-white font-medium rounded-lg transition-colors"
              >
                Load More Products
              </Link>
            )}
            {page > 1 && (
              <Link
                href={`/trending/${categorySlug}?filter=${activeFilter}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${page > 2 ? `&page=${page - 1}` : ''}`}
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

