import { getProductBySlug, getRelatedProducts } from '@/lib/products'
import { getTrendEmoji, getTrendLabel, formatTrendDuration, getSalesSpikePercent } from '@/lib/product-utils'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import ProductImage from '@/components/ProductImage'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  
  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  // Get site URL for canonical links - always use production domain, not preview URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'
  const productUrl = `${siteUrl}/products/${slug}`
  
  // Get product image URL (prefer product image, fallback to Amazon image)
  let imageUrl = product.imageUrl
  if (!imageUrl && product.amazonUrl) {
    // Try to get Amazon image from URL
    const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
    if (asinMatch) {
      imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asinMatch[1]}.01._SCLZZZZZZZ_.jpg`
    }
  }
  // Fallback to a default image if no image available
  if (!imageUrl) {
    imageUrl = `${siteUrl}/og-default.png` // You can create this later
  }
  
  // Ensure image URL is absolute
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${siteUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
  }
  
  // Get trend stats for SEO
  const amazonSignals = (product.trendSignals || []).filter((s: any) => s.source === 'amazon_movers' || s.source === 'amazon')
  const salesSpike = amazonSignals.find((s: any) => s.signalType === 'sales_spike')?.value ||
                    amazonSignals.find((s: any) => s.metadata?.salesJumpPercent)?.metadata?.salesJumpPercent || 0
  
  // Determine trending signal for title
  let trendingSignal = 'trending'
  if (salesSpike > 1000) trendingSignal = 'viral'
  else if (salesSpike > 500) trendingSignal = 'viral'
  else if (product.trendScore >= 70) trendingSignal = 'viral'
  else if (product.trendScore >= 50) trendingSignal = 'trending'
  else trendingSignal = 'popular'
  
  // Get category for title
  const category = product.category || 'beauty product'
  const categoryLower = category.toLowerCase()
  
  // Create SEO-optimized title (max 60 chars)
  // Format: [Product Name] Review: Is This [Trending Signal] [Category] Worth It?
  // Note: This is the META title (browser tab), not the H1 content title
  const trendingSignalText = trendingSignal === 'viral' ? 'Viral' : trendingSignal === 'trending' ? 'Trending' : 'Popular'
  
  // Build title - NO price in meta title, just product name + review question
  const suffix = ` Review: Is This ${trendingSignalText} ${categoryLower} Worth It?`
  const siteName = ' | StyleLuxe'
  const maxTitleLength = 60 // Max 60 chars for SEO (excluding site name)
  
  // Calculate available space for product name
  const availableForName = maxTitleLength - suffix.length - siteName.length
  
  // Truncate product name if needed
  let productNameForTitle = product.name
  if (productNameForTitle.length > availableForName) {
    productNameForTitle = productNameForTitle.substring(0, Math.max(10, availableForName - 3)) + '...'
  }
  
  const title = `${productNameForTitle}${suffix}${siteName}`
  
  // Final fallback if still too long
  const finalTitle = title.length > 60 
    ? `${product.name.substring(0, Math.min(20, 60 - 20))}... Review: Worth It?${siteName}`
    : title
  
  // Create SEO-optimized meta description (150-160 chars)
  // Format: [Product] jumped [X%] in Amazon sales. At $[price], is this trending [category] actually worth it? Honest review based on real user experiences.
  const priceText = product.price ? `$${product.price.toFixed(2)}` : ''
  const salesSpikeText = salesSpike > 0 ? `jumped ${Math.round(salesSpike)}% in Amazon sales` : 'is trending on Amazon'
  const reviewCount = product.metadata?.totalReviewCount || (product.reviews?.length || 0) * 20
  const reviewText = reviewCount > 0 ? `${reviewCount.toLocaleString()}+ real user experiences` : 'real user experiences'
  
  let description = ''
  if (salesSpike > 0 && priceText) {
    description = `${product.name} ${salesSpikeText}. At ${priceText}, is this trending ${categoryLower} actually worth it? Honest review based on ${reviewText}.`
  } else if (priceText) {
    description = `${product.name} is trending on Amazon. At ${priceText}, is this ${categoryLower} actually worth it? Honest review based on ${reviewText}.`
  } else {
    description = `${product.name} is trending on Amazon. Is this ${categoryLower} actually worth it? Honest review based on ${reviewText}.`
  }
  
  // Ensure description is 150-160 characters
  if (description.length > 160) {
    description = description.substring(0, 157) + '...'
  } else if (description.length < 150) {
    // Pad with more context if needed
    const hook = product.content?.hook?.replace(/[#*]/g, '').substring(0, 160 - description.length - 3) || ''
    if (hook) description = `${description} ${hook}`
  }
  
  // Get price for structured data
  const priceAmount = product.price ? product.price.toFixed(2) : null
  const rating = product.metadata?.starRating || null
  // reviewCount already defined above for meta description

  // Enhanced Open Graph title with sales spike
  const ogTitle = salesSpike > 0 
    ? `${product.name} Review: ${Math.round(salesSpike)}% Sales Spike - Worth It?`
    : title

  // Enhanced Twitter description with price and worth-it question
  const twitterDescription = priceText 
    ? `${product.name} at ${priceText}. Is this trending ${categoryLower} worth the hype?`
    : description

  return {
    title: finalTitle,
    description,
    keywords: [
      product.name,
      product.brand,
      'review',
      'beauty product',
      'skincare',
      'makeup',
      product.category?.toLowerCase(),
      'trending',
      'worth it',
      'honest review',
    ].filter(Boolean).join(', '),
    
    // Open Graph / Facebook - Enhanced with product data
    openGraph: {
      title: ogTitle,
      description,
      url: productUrl,
      siteName: 'StyleLuxe',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} - Trending ${product.category || 'Beauty'} Product`,
        },
      ],
      locale: 'en_US',
      type: 'article',
    },
    
    // Twitter Card - Enhanced
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: twitterDescription,
      images: [imageUrl],
      creator: '@styleluxe',
    },
    
    // Additional SEO
    alternates: {
      canonical: productUrl,
    },
    
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    // Structured Data (JSON-LD will be added in the page component)
    other: {
      'product:price:amount': priceAmount || undefined,
      'product:price:currency': product.currency || 'USD',
      'product:availability': 'in stock',
      'product:condition': 'new',
      'product:brand': product.brand || undefined,
      'product:category': product.category || undefined,
    },
  }
}

// Helper to get trend stats
function getTrendStats(product: any) {
  const redditSignals = (product.trendSignals || []).filter((s: any) => s.source === 'reddit_skincare' || s.source === 'reddit')
  const amazonSignals = (product.trendSignals || []).filter((s: any) => s.source === 'amazon_movers' || s.source === 'amazon')
  
  // Calculate Reddit mentions (sum of upvotes or use signal values)
  const redditMentions = redditSignals.reduce((sum: number, s: any) => {
    // Use value (upvotes) or estimate from metadata
    const upvotes = s.value || 0
    const metadataUpvotes = s.metadata?.upvotes || s.metadata?.score || 0
    return sum + Math.max(upvotes, metadataUpvotes)
  }, 0)
  
  // Get sales spike
  const salesSpike = amazonSignals.find((s: any) => s.signalType === 'sales_spike')?.value ||
                    amazonSignals.find((s: any) => s.metadata?.salesJumpPercent)?.metadata?.salesJumpPercent
  
  // Get Amazon review count from metadata or estimate from reviews
  let amazonReviewCount: number | null = null
  if (product.metadata?.totalReviewCount) {
    amazonReviewCount = product.metadata.totalReviewCount
  } else if (product.reviews && product.reviews.length > 0) {
    // Estimate: if we have reviews, multiply by a factor (Amazon shows more than we scrape)
    // Rough estimate: if we scraped 20 reviews, there might be 100-500 total
    const scrapedReviews = product.reviews.filter((r: any) => r.source === 'AMAZON' || !r.source).length
    if (scrapedReviews > 0) {
      // Conservative estimate: multiply by 10-50x depending on how many we have
      amazonReviewCount = scrapedReviews * 20 // Rough estimate
    }
  }
  
  // Reddit hotness level from content (manual rating 1-5)
  let redditHotnessLabel: string | null = null
  if (product.content?.redditHotness) {
    const labels = ['Low', 'Growing', 'Strong', 'Trending', 'Breakout']
    redditHotnessLabel = labels[product.content.redditHotness - 1]
  }
  
  // Google Trends URL
  const googleTrendsUrl = product.content?.googleTrendsData?.url || null
  
  // Reddit mentions scale (estimate based on signals if no manual rating)
  let redditScale: string | null = null
  if (redditHotnessLabel) {
    redditScale = redditHotnessLabel
  } else if (redditMentions > 0) {
    if (redditMentions >= 1000) {
      redditScale = '🔥 Very High'
    } else if (redditMentions >= 500) {
      redditScale = '📈 High'
    } else if (redditMentions >= 200) {
      redditScale = '📊 Moderate'
    } else if (redditMentions >= 50) {
      redditScale = '💬 Low'
    } else {
      redditScale = '👀 Minimal'
    }
  } else if (redditSignals.length > 0) {
    // If we have signals but no upvotes, estimate based on signal count
    redditScale = redditSignals.length >= 3 ? '📊 Moderate' : '💬 Low'
  }
  
  return {
    redditMentions: Math.round(redditMentions),
    redditScale,
    redditHotnessLabel,
    redditHotness: product.content?.redditHotness || null,
    salesSpike: salesSpike ? Math.round(salesSpike) : null,
    amazonReviewCount,
    trendDuration: formatTrendDuration(product.trendSignals || []),
    googleTrendsUrl,
  }
}

// Generate static params for top products (ISR)
export async function generateStaticParams() {
  // Pre-generate pages for top 50 products
  try {
    const { prisma } = await import('@/lib/prisma')
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
      },
      include: {
        content: {
          select: { slug: true },
        },
      },
      orderBy: {
        currentScore: 'desc',
      },
      take: 50,
    })
    
    return products
      .filter(p => p.content?.slug)
      .map(product => ({
        slug: product.content!.slug,
      }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

// Revalidate product pages every 60 seconds (cache invalidation on publish/generate will override this)
export const revalidate = 60

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product || !product.content) {
    notFound()
  }

  const trendEmoji = getTrendEmoji(product.trendScore)
  const trendLabel = getTrendLabel(product.trendScore)
  const stats = getTrendStats(product)
  
  // One-sentence verdict (from hook or generate from content)
  const verdict = product.content.hook || `${product.name} is ${product.trendScore >= 70 ? 'worth the hype' : 'trending but proceed with caution'}.`

  // Get site URL for canonical links - always use production domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'
  
  // Get related products for internal linking
  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    product.currentScore || product.trendScore,
    3
  )
  
  // Format dates consistently for server/client rendering
  // Use UTC dates and fixed format to avoid locale/timezone differences
  const publishedDate = product.content.generatedAt || product.createdAt
  const updatedDate = product.content.updatedAt
  const publishedDateObj = publishedDate ? new Date(publishedDate) : new Date(product.createdAt)
  const updatedDateObj = updatedDate ? new Date(updatedDate) : null
  
  // Format dates using UTC to ensure server/client consistency
  const formatDate = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    const month = months[date.getUTCMonth()]
    const day = date.getUTCDate()
    const year = date.getUTCFullYear()
    return `${month} ${day}, ${year}`
  }
  
  const formattedPublishedDate = formatDate(publishedDateObj)
  const formattedUpdatedDate = updatedDateObj ? formatDate(updatedDateObj) : ''
  
  // Get product image for structured data
  let imageUrl = product.imageUrl
  if (!imageUrl && product.amazonUrl) {
    const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
    if (asinMatch) {
      imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asinMatch[1]}.01._SCLZZZZZZZ_.jpg`
    }
  }

  // Structured Data (JSON-LD) for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.content?.hook || product.content?.whyTrending || `Review of ${product.name}`,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    image: imageUrl,
    offers: product.price ? {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'USD',
      availability: 'https://schema.org/InStock',
      url: product.amazonUrl,
      seller: {
        '@type': 'Organization',
        name: 'Amazon',
      },
    } : undefined,
    aggregateRating: product.metadata?.starRating && product.metadata?.totalReviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: product.metadata.starRating,
      reviewCount: product.metadata.totalReviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    review: product.reviews && product.reviews.length > 0 ? product.reviews.slice(0, 5).map((review: any) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author || 'Anonymous',
      },
      datePublished: review.date || product.updatedAt,
      reviewBody: review.content,
      reviewRating: review.rating ? {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      } : undefined,
    })) : undefined,
  }

  // Review structured data (separate from Product schema)
  const reviewStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: product.name,
      brand: product.brand ? {
        '@type': 'Brand',
        name: product.brand,
      } : undefined,
      image: imageUrl,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: product.metadata?.starRating || 4, // Default to 4 out of 5
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Organization',
      name: 'StyleLuxe',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'StyleLuxe',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    datePublished: product.content?.generatedAt || product.createdAt,
    dateModified: product.content?.updatedAt || product.updatedAt,
    reviewBody: product.content?.hook || product.content?.whyTrending || `Review of ${product.name}`,
  }

  // Article structured data (for blog-style content)
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${product.name} Review: Is This ${stats.salesSpike ? `${Math.round(stats.salesSpike)}% Sales Spike` : 'Trending'} ${product.category || 'Beauty Product'} Worth It?`,
    description: product.content?.hook || `Review of ${product.name}`,
    image: imageUrl,
    datePublished: product.content?.generatedAt || product.createdAt,
    dateModified: product.content?.updatedAt || product.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'StyleLuxe',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'StyleLuxe',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`, // Update with your logo URL
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/products/${slug}`,
    },
  }

  // FAQPage structured data
  const faqStructuredData = product.content?.faq && Array.isArray(product.content.faq) && product.content.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (product.content.faq as Array<{ question: string; answer: string }>).map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null

  // Breadcrumb structured data - includes category
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Trending Products',
      item: `${siteUrl}/trending`,
    },
  ]
  
  // Add category if available
  if (product.category) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: product.category,
      item: `${siteUrl}/trending?category=${encodeURIComponent(product.category.toLowerCase())}`,
    })
  }
  
  // Add product name
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: product.name,
    item: `${siteUrl}/products/${slug}`,
  })
  
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      {faqStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}
      
      <div className="min-h-screen bg-[#fafafa]">
        {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-3xl font-bold tracking-tight">
              <span className="text-[#1a1a1a]">Style</span><span className="text-[#8b5cf6]">Luxe</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-sm text-[#4a4a4a] hover:text-[#1a1a1a] font-medium text-sm tracking-wide transition-colors">
                Trending
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <article className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Preview Banner for DRAFT products */}
        {product.status === 'DRAFT' && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <p className="text-sm text-yellow-800">
              <strong>Preview Mode:</strong> This product is in DRAFT status and not yet published. 
              <Link href={`/admin/products/${product.id}/edit`} className="ml-2 underline font-medium">
                Edit & Publish →
              </Link>
            </p>
          </div>
        )}
        
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-[#6b6b6b] flex-wrap">
            <li>
              <Link href="/" className="hover:text-[#1a1a1a] transition-colors">
                Home
              </Link>
            </li>
            <li className="text-[#b8b8b8]">/</li>
            <li>
              <Link href="/trending" className="hover:text-[#1a1a1a] transition-colors">
                Trending Products
              </Link>
            </li>
            {product.category && (
              <>
                <li className="text-[#b8b8b8]">/</li>
                <li>
                  <Link href={`/trending?category=${encodeURIComponent(product.category.toLowerCase())}`} className="hover:text-[#1a1a1a] transition-colors">
                    {product.category}
                  </Link>
                </li>
              </>
            )}
            <li className="text-[#b8b8b8]">/</li>
            <li className="text-[#1a1a1a] font-medium" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            {/* Product Image */}
            <div className="aspect-square bg-[#f5f5f5] rounded-2xl overflow-hidden shadow-lg">
              <ProductImage 
                imageUrl={product.imageUrl}
                amazonUrl={product.amazonUrl}
                productName={product.name}
                category={product.category}
              />
            </div>

            {/* Product Info */}
            <div>
              {/* Brand */}
              {product.brand && (
                <p className="text-sm font-light text-[#6b6b6b] uppercase tracking-wider mb-3">
                  {product.brand}
                </p>
              )}

              {/* Product Name - H1 */}
              <h1 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-6 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Trend Indicator */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-4xl">{trendEmoji}</span>
                <div>
                  <div className="text-base font-semibold text-[#1a1a1a]">{trendLabel}</div>
                  <div className="text-xs text-[#6b6b6b] tracking-wide">
                    Trend Score: {product.trendScore.toFixed(0)}/100
                  </div>
                </div>
              </div>

              {/* Price & Buy */}
              <div className="mb-8">
                {product.price && (
                  <p className="text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-atkinson)' }}>
                    ${product.price.toFixed(2)}
                    {product.currency && product.currency !== 'USD' && ` ${product.currency}`}
                  </p>
                )}

                {/* Where to Buy */}
                {product.amazonUrl ? (
                  <a
                    href={addAmazonAffiliateTag(product.amazonUrl) || product.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full md:w-auto bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-10 py-4 rounded-xl font-semibold text-center transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Buy on Amazon →
                  </a>
                ) : (
                  <div className="text-sm text-[#6b6b6b] italic font-light">
                    Purchase link coming soon
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* One-Sentence Verdict - Full Width */}
          <div className="border-l-4 border-[#8b5cf6] pl-6 py-4 bg-white rounded-r-lg shadow-sm">
            <p className="text-[#4a4a4a] font-medium italic leading-relaxed">
              "{verdict}"
            </p>
          </div>
        </section>

        {/* Content Sections */}
        <div className="space-y-20">
          {/* Why It's Trending Right Now */}
          {product.content.whyTrending && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">Why It's Trending Right Now</h2>
              <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                <MarkdownContent content={product.content.whyTrending || ''} />
              </div>
              
              {/* Actual Numbers */}
              {(stats.amazonReviewCount || stats.redditHotness || stats.redditScale || stats.salesSpike || stats.googleTrendsUrl || stats.trendDuration) && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Amazon Reviews - Show if we have count OR if product has Amazon URL (estimate) */}
                  {(stats.amazonReviewCount || product.amazonUrl) ? (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 shadow-sm">
                      <div className="text-2xl font-bold text-orange-900">
                        {stats.amazonReviewCount 
                          ? (stats.amazonReviewCount >= 1000 
                              ? `${(stats.amazonReviewCount / 1000).toFixed(1)}k`
                              : stats.amazonReviewCount.toLocaleString())
                          : '—'}
                      </div>
                      <div className="text-sm text-orange-700 mt-1 font-light">Amazon reviews</div>
                    </div>
                  ) : null}
                  {/* Reddit Trending - Show if we have hotness, scale, or any Reddit signals */}
                  {(stats.redditHotness || stats.redditScale || (product.trendSignals && product.trendSignals.some((s: any) => s.source?.includes('reddit')))) ? (
                    <div className={`rounded-xl p-4 border shadow-sm ${
                      stats.redditHotness === 1 ? 'bg-[#f5f5f5] border-[#e5e5e5]' :
                      stats.redditHotness === 2 ? 'bg-blue-50 border-blue-200' :
                      stats.redditHotness === 3 ? 'bg-green-50 border-green-200' :
                      stats.redditHotness === 4 ? 'bg-orange-50 border-orange-200' :
                      stats.redditHotness === 5 ? 'bg-red-50 border-red-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className={`text-lg font-bold ${
                        stats.redditHotness === 1 ? 'text-[#1a1a1a]' :
                        stats.redditHotness === 2 ? 'text-blue-900' :
                        stats.redditHotness === 3 ? 'text-green-900' :
                        stats.redditHotness === 4 ? 'text-orange-900' :
                        stats.redditHotness === 5 ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {stats.redditHotnessLabel || stats.redditScale || 'Reddit'}
                      </div>
                      <div className={`text-xs mt-1 font-light ${
                        stats.redditHotness === 1 ? 'text-[#6b6b6b]' :
                        stats.redditHotness === 2 ? 'text-blue-700' :
                        stats.redditHotness === 3 ? 'text-green-700' :
                        stats.redditHotness === 4 ? 'text-orange-700' :
                        stats.redditHotness === 5 ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        Reddit trending
                      </div>
                    </div>
                  ) : null}
                  {/* Sales Spike */}
                  {stats.salesSpike ? (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm">
                      <div className="text-2xl font-bold text-green-900">+{stats.salesSpike}%</div>
                      <div className="text-sm text-green-700 mt-1 font-light">Sales spike</div>
                    </div>
                  ) : null}
                  {/* Google Trends - Show if URL exists */}
                  {stats.googleTrendsUrl ? (
                    <div className="bg-[#f3e8ff] rounded-xl p-4 border border-[#8b5cf6]/20 shadow-sm">
                      <a
                        href={stats.googleTrendsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <div className="text-sm font-bold text-[#8b5cf6] group-hover:text-[#7c3aed] transition-colors">
                          Google Trends
                        </div>
                        <div className="text-xs text-[#6b6b6b] mt-1 group-hover:underline font-light">
                          View trends →
                        </div>
                      </a>
                    </div>
                  ) : null}
                  {/* Timeline */}
                  {stats.trendDuration ? (
                    <div className="bg-[#f5f5f5] rounded-xl p-4 border border-[#e5e5e5] shadow-sm">
                      <div className="text-sm font-semibold text-[#1a1a1a]">{stats.trendDuration}</div>
                      <div className="text-xs text-[#6b6b6b] mt-1 font-light">Timeline</div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {/* What It Actually Does */}
          {product.content.whatItDoes && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">What It Actually Does</h2>
              <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                <MarkdownContent content={product.content.whatItDoes || ''} />
              </div>
            </section>
          )}

          {/* The Good & The Bad */}
          <div className="grid md:grid-cols-2 gap-12">
            {product.content.theGood && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-green-700 mb-6 tracking-tight">The Good</h2>
                <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                  <MarkdownContent content={product.content.theGood || ''} />
                </div>
              </section>
            )}

            {product.content.theBad && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-red-700 mb-6 tracking-tight">The Bad</h2>
                <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                  <MarkdownContent content={product.content.theBad || ''} />
                </div>
              </section>
            )}
          </div>

          {/* What Real Users Are Saying */}
          {product.content.whatRealUsersSay && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">What Real Users Are Saying</h2>
              <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                <MarkdownContent content={product.content.whatRealUsersSay || ''} />
              </div>
            </section>
          )}

          {/* Who Should Try / Skip */}
          <div className="grid md:grid-cols-2 gap-12">
            {product.content.whoShouldTry && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">Who Should Try It</h2>
                <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                  <MarkdownContent content={product.content.whoShouldTry || ''} />
                </div>
              </section>
            )}

            {product.content.whoShouldSkip && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">Who Should Skip It</h2>
                <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                  <MarkdownContent content={product.content.whoShouldSkip || ''} />
                </div>
              </section>
            )}
          </div>

          {/* Alternatives Worth Considering */}
          {product.content.alternatives && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">Alternatives Worth Considering</h2>
              <div className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">
                <MarkdownContent content={product.content.alternatives || ''} />
              </div>
            </section>
          )}

          {/* FAQ */}
          {product.content.faq && Array.isArray(product.content.faq) && product.content.faq.length > 0 && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">FAQ</h2>
              <div className="space-y-8">
                {(product.content.faq as Array<{ question: string; answer: string }>).map((faq, index) => (
                  <div key={index} className="border-l-4 border-[#8b5cf6] pl-8 py-4 bg-white rounded-r-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-[#1a1a1a] mb-3">{faq.question}</h3>
                    <p className="prose prose-lg max-w-none text-[#4a4a4a] leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
              
              {/* Publish/Update Dates */}
              <div className="mt-8 text-xs text-[#6b6b6b] tracking-wide">
                <time dateTime={publishedDateObj.toISOString()}>
                  Published: {formattedPublishedDate}
                </time>
                {updatedDateObj && (
                  <>
                    {' • '}
                    <time dateTime={updatedDateObj.toISOString()}>
                      Updated: {formattedUpdatedDate}
                    </time>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <section className="mt-20 pt-12 border-t-2 border-[#e5e5e5]">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-8 tracking-tight">
                {product.category ? `Similar Trending ${product.category} Products` : 'Similar Trending Products'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedProducts.map((relatedProduct) => (
                  <Link
                    key={relatedProduct.id}
                    href={`/products/${relatedProduct.content?.slug}`}
                    className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-[#f5f5f5] relative">
                      {relatedProduct.imageUrl ? (
                        <img
                          src={relatedProduct.imageUrl}
                          alt={`${relatedProduct.name} - Trending ${relatedProduct.category || 'Beauty'} Product`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <span className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-semibold text-[#8b5cf6]">
                          {getTrendEmoji(relatedProduct.trendScore)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-[#1a1a1a] mb-1 line-clamp-2 leading-tight">{relatedProduct.name}</h3>
                      {relatedProduct.brand && (
                        <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">{relatedProduct.brand}</p>
                      )}
                      {relatedProduct.price && (
                        <p className="text-base font-bold text-[#1a1a1a]">${relatedProduct.price.toFixed(2)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* The Verdict (Optional Footer) */}
          <section className="mt-20 pt-12 border-t-2 border-[#e5e5e5]">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-6 tracking-tight">The Verdict</h2>
            <div className="bg-white rounded-2xl p-8 mb-4 shadow-sm border border-[#e5e5e5]">
              <p className="text-lg text-[#4a4a4a] leading-relaxed mb-4">
                <strong className="text-[#1a1a1a]">Is it worth the hype?</strong> {verdict}
              </p>
              <p className="text-sm text-[#6b6b6b] tracking-wide">
                Last updated: {formattedUpdatedDate || formattedPublishedDate}
              </p>
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 pt-12 border-t border-[#e5e5e5] text-center">
          <p className="text-[#6b6b6b] mb-4 font-light">Found this helpful? Check out more trending products.</p>
          <Link 
            href="/"
            className="inline-block text-[#8b5cf6] font-medium hover:text-[#7c3aed] transition-colors"
          >
            ← Back to Trending Dashboard
          </Link>
        </div>
      </article>

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
              © 2025 StyleLuxe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}

