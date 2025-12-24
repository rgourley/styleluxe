import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { unstable_cache } from 'next/cache'

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

async function getFilteredProducts(filter: string) {
  const cachedFn = unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) {
        return []
      }

      try {
        const where: any = {
          status: 'PUBLISHED',
          OR: [
            { price: { gte: 5 } },
            { price: null },
          ],
        }

        // Apply filter
        switch (filter) {
          case 'hot':
            where.currentScore = { gte: 70 }
            break
          case 'rising':
            where.currentScore = {
              gte: 50,
              lte: 69,
            }
            break
          case 'recent':
            where.daysTrending = { gt: 7 }
            break
          case 'all':
          default:
            where.currentScore = { gte: 40 }
            break
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
              content: true,
            },
            orderBy: filter === 'recent' 
              ? { peakScore: 'desc' }
              : { currentScore: 'desc' },
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
    [`trending-${filter}`],
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
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const activeFilter = params.filter || 'all'

  const products = await getFilteredProducts(activeFilter)

  const filters = [
    { id: 'all', label: 'All', description: 'Score 40+' },
    { id: 'hot', label: 'Hot', description: 'Score 70+' },
    { id: 'rising', label: 'Rising', description: 'Score 50-69' },
    { id: 'recent', label: 'Recent', description: 'Days trending > 7' },
  ]

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-4 md:py-0 md:h-20">
            <Link href="/" className="text-2xl md:text-3xl font-bold tracking-tight flex-shrink-0">
              <span className="text-[#1a1a1a]">Style</span><span className="text-[#8b5cf6]">Luxe</span>
            </Link>
            <nav className="flex space-x-6 md:space-x-10 flex-shrink-0">
              <Link href="/trending" className="text-[#4a4a4a] hover:text-[#1a1a1a] font-medium text-sm tracking-wide transition-colors">
                All Trending
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
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
                      ? 'border-[#8b5cf6] text-[#8b5cf6]'
                      : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a] hover:border-[#d5d5d5]'
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
              className="text-[#8b5cf6] hover:text-[#7c3aed] underline"
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

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-4">Pages</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/trending" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    All Trending
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-4">StyleLuxe</h3>
              <p className="text-sm text-[#6b6b6b]">
                Track trending beauty products from TikTok, Instagram, Reddit, and Amazon.
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[#e5e5e5] text-center text-sm text-[#8b8b8b]">
            <p>&copy; {new Date().getFullYear()} StyleLuxe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

