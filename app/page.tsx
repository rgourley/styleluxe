import { 
  getTrendingNowHomepage,
  getAboutToExplodeProducts,
  getRecentlyHotProducts,
  searchProducts,
} from '@/lib/trending-products'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'

// Fixed header for consistency (no date dependency to avoid hydration issues)
const headerText = "Trending Beauty Products Right Now"

// Revalidate homepage every 60 seconds to keep it fresh
export const revalidate = 60

// Generate metadata for better SEO - canonical URLs always use production domain
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata = {
  title: "Trending Beauty Products Right Now - What's Going Viral",
  description: "Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews, no hype.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Trending Beauty Products Right Now - What's Going Viral",
    description: "Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews, no hype.",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: "/images/unsplash-image-4nulm-JUYFo.webp",
        width: 1200,
        height: 630,
        alt: "Trending Beauty Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trending Beauty Products Right Now",
    description: "Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon.",
    images: ["/images/unsplash-image-4nulm-JUYFo.webp"],
  },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const searchQuery = params.q

  // Fetch all sections in parallel for better performance
  const [
    trendingNow,
    aboutToExplode,
    recentlyHot,
  ] = await Promise.all([
    getTrendingNowHomepage(6), // Changed to 6 for consistency
    getAboutToExplodeProducts(6),
    getRecentlyHotProducts(6),
  ])
  
  // Handle search
  let filteredProducts: any[] = []
  let showSections = true
  
  if (searchQuery) {
    filteredProducts = await searchProducts(searchQuery, 20)
    showSections = false
  }
  
  // Removed currentDate to avoid hydration mismatch (timezone differences)

  // Get site URL for canonical links - always use production domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

  // Structured data for SEO
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StyleLuxe',
    url: siteUrl,
    description: 'Track trending beauty products from TikTok, Instagram, Reddit, and Amazon',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const collectionPageStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Trending Beauty Products',
    description: 'Discover trending beauty products tracked from TikTok, Instagram, Reddit, and Amazon',
    url: siteUrl,
  }

  // FAQ Structured Data for SEO
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What makes a beauty product "trending"?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A product is considered trending when it shows significant activity across multiple platforms. This includes sales spikes on Amazon, viral TikTok videos, Instagram influencer mentions, and active Reddit discussions. We combine data from all these sources to identify products that are genuinely gaining momentum, not just being promoted by brands.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often do you update the trending products list?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We update our trending beauty products list daily. Our system continuously monitors TikTok, Instagram, Reddit, and Amazon for new signals. Products that show sustained trending activity get featured on our homepage, while new viral products are added as soon as they\'re detected.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are trending beauty products worth buying?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Not always. That\'s why we create honest reviews for each trending product. We analyze real user reviews from Amazon and Reddit, look at verified purchase data, and test products when possible. Our reviews tell you what\'s actually good, what\'s overhyped, and who should (or shouldn\'t) try each product. Just because something is trending doesn\'t mean it\'s right for everyone.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do you track products on TikTok and Instagram?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We monitor beauty-related hashtags, viral video trends, and influencer mentions on TikTok and Instagram. When a product appears frequently in viral beauty content or gets mentioned by multiple influencers, it\'s flagged as trending. We combine this social media data with sales data from Amazon and discussions on Reddit to get a complete picture.',
        },
      },
      {
        '@type': 'Question',
        name: 'What types of beauty products do you track?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We track all types of trending beauty products including skincare (cleansers, serums, moisturizers, sunscreens), makeup (foundation, concealer, lip products, eyeshadow), hair care, and beauty tools. If it\'s trending on TikTok, Instagram, Reddit, or Amazon, we\'ll track it and create a review.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I search for specific trending products?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Use the search bar at the top of the page to find specific products. You can also filter by category (skincare, makeup, hair care, etc.) to see trending products in that category. Each product page includes detailed reviews, real user quotes, and honest assessments of whether it\'s worth the hype.',
        },
      },
    ],
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageStructuredData) }}
      />
      
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

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a1a] mb-6 tracking-tight leading-tight">
            Trending Beauty Products<br />Right Now
          </h1>
          <p className="text-xl md:text-2xl text-[#4a4a4a] max-w-3xl mx-auto mb-4 leading-relaxed font-light">
            We track trending beauty products across <strong className="font-semibold text-[#1a1a1a]">TikTok</strong>, <strong className="font-semibold text-[#1a1a1a]">Instagram</strong>, <strong className="font-semibold text-[#1a1a1a]">Reddit</strong>, and <strong className="font-semibold text-[#1a1a1a]">Amazon</strong>. 
            Discover what's actually going viral before everyone else finds out.
          </p>
          <p className="text-lg text-[#6b6b6b] max-w-2xl mx-auto mb-3 font-light">
            Real data from multiple platforms. Honest reviews. No hype.
          </p>
          <p className="text-sm text-[#8b8b8b] mb-8 tracking-wide uppercase letter-spacing-wider">
            Updated daily
          </p>
        </div>

        {/* Search Results */}
        {searchQuery ? (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Search Results for "{searchQuery}"
              {filteredProducts.length > 0 && (
                <span className="text-lg font-normal text-gray-500 ml-2">
                  ({filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'})
                </span>
              )}
            </h2>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No products found for "{searchQuery}"
                </p>
                <Link href="/" className="text-purple-600 hover:text-purple-700 underline mt-4 inline-block">
                  View all products
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Section 1: Trending Now */}
            {trendingNow.length > 0 && (
              <section className="mb-20">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-3 tracking-tight">
                      Trending Now
                    </h2>
                    <p className="text-sm text-[#6b6b6b] tracking-wide">
                      The hottest products right now - score 70+ and trending within the last 7 days
                    </p>
                  </div>
                  <Link 
                    href="/trending?filter=hot"
                    className="text-sm font-medium text-[#8b5cf6] hover:text-[#7c3aed] transition-colors whitespace-nowrap"
                  >
                    View More →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {trendingNow.map((product, index) => (
                    <ProductCard key={product.id} product={product} priority={index < 4} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: About to Explode */}
            {aboutToExplode.length > 0 && (
              <section className="mb-20">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-3 tracking-tight">
                      About to Explode
                    </h2>
                    <p className="text-sm text-[#6b6b6b] tracking-wide">
                      Products with rising scores (50-69) or early signals - trending within the last 7 days
                    </p>
                  </div>
                  <Link 
                    href="/trending?filter=rising"
                    className="text-sm font-medium text-[#8b5cf6] hover:text-[#7c3aed] transition-colors whitespace-nowrap"
                  >
                    View More →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {aboutToExplode.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 3: Recently Hot */}
            {recentlyHot.length > 0 && (
              <section className="mb-20">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-3 tracking-tight">
                      Recently Hot
                    </h2>
                    <p className="text-sm text-[#6b6b6b] tracking-wide">
                      Products that peaked at 70+ and were trending 8-30 days ago
                    </p>
                  </div>
                  <Link 
                    href="/trending?filter=recent"
                    className="text-sm font-medium text-[#8b5cf6] hover:text-[#7c3aed] transition-colors whitespace-nowrap"
                  >
                    View More →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recentlyHot.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* How We Track Trends - SEO Content Section (Lower on page) */}
            <section className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-sm border border-[#e5e5e5] overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image on Left */}
                  <div className="relative w-full min-h-[400px] md:min-h-[600px] bg-[#f5f5f5] overflow-hidden">
                    <img 
                      src="/images/unsplash-image-4nulm-JUYFo.webp" 
                      alt="Beauty trends tracking - woman with blonde hair" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Content on Right */}
                  <div className="p-10 md:p-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">How We Track Trending Beauty Products</h2>
                    <div className="prose prose-lg max-w-none text-[#4a4a4a] space-y-5 leading-relaxed">
                      <p>
                        We monitor multiple platforms to identify which beauty products are trending right now. Our system tracks:
                      </p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong>TikTok</strong> - Products going viral in beauty and skincare videos</li>
                        <li><strong>Instagram</strong> - Beauty influencers and hashtag trends</li>
                        <li><strong>Reddit</strong> - Real discussions in r/SkincareAddiction, r/MakeupAddiction, and other beauty communities</li>
                        <li><strong>Amazon</strong> - Sales spikes, Movers & Shakers lists, and review trends</li>
                      </ul>
                      <p>
                        When a product shows significant activity across these platforms, we create detailed reviews that cut through the marketing hype. 
                        Our reviews combine real user experiences, verified purchase data, and honest assessments of whether trending products are actually worth it.
                      </p>
                      <p>
                        Looking for the hottest beauty products right now? You've come to the right place. We update our trending products list daily 
                        so you can discover viral beauty products before they sell out.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </>
        )}

        {/* Empty State */}
        {!searchQuery && trendingNow.length === 0 && aboutToExplode.length === 0 && recentlyHot.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No trending products yet.</p>
            <p className="text-gray-400 mb-4">Products will appear here once they're flagged and published.</p>
            <div className="text-sm text-gray-500 space-y-2">
              <p>💡 <strong>Getting started:</strong></p>
              <ol className="list-decimal list-inside space-y-1 max-w-md mx-auto text-left">
                <li>Make sure your database is set up and migrations are run</li>
                <li>Run data collection automatically via scheduled cron jobs</li>
                <li>Generate and publish product reviews</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div>
              <Link href="/" className="text-2xl font-bold tracking-tight mb-4 inline-block">
                <span className="text-[#1a1a1a]">Style</span><span className="text-[#8b5cf6]">Luxe</span>
              </Link>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">
                Tracking trending beauty products from TikTok, Instagram, Reddit, and Amazon.
              </p>
            </div>

            {/* Pages Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-wide uppercase">Pages</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Trending Products
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-wide uppercase">Legal</h3>
              <ul className="space-y-3">
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

            {/* Info Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-wide uppercase">Info</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed mb-4">
                Real data. Honest reviews. No hype.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e5e5e5] text-center">
            <p className="text-xs text-[#8b8b8b] tracking-wider uppercase">
              © {new Date().getFullYear()} StyleLuxe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}
