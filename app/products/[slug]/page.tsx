import { getProductBySlug, getRelatedProducts } from '@/lib/products'
import { getTrendEmoji, getTrendLabel, formatTrendDuration, getSalesSpikePercent } from '@/lib/product-utils'
import { getTimelineText } from '@/lib/age-decay'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'
import { findProductByName } from '@/lib/product-search'
import { getCategorySlug } from '@/lib/category-metadata'
import { brandToSlug } from '@/lib/brands'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import ProductImage from '@/components/ProductImage'
import ProductHeroSection from '@/components/ProductHeroSection'
import StatCard from '@/components/StatCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AlternativeProduct from '@/components/AlternativeProduct'
import UserQuoteCard from '@/components/UserQuoteCard'
import ProductViewTracker from '@/components/ProductViewTracker'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  
  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  // Get site URL for canonical links - always use production domain, not preview URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'
  const productUrl = `${siteUrl}/products/${slug}`
  
  // Get product image URL (prefer R2 URLs, avoid Amazon URLs)
  let imageUrl = product.imageUrl
  // Only use product.imageUrl if it's an R2 URL or not an Amazon URL
  if (imageUrl && (imageUrl.includes('amazon.com') || imageUrl.includes('amazonaws'))) {
    // If imageUrl is an Amazon URL, don't use it (it might be blocked)
    // Try to get from Amazon as fallback only if no R2 URL exists
    imageUrl = null
  }
  // Only fallback to Amazon image if we don't have a valid imageUrl
  if (!imageUrl && product.amazonUrl) {
    // Try to get Amazon image from URL (last resort)
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
  const siteName = ' | BeautyFinder'
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
      siteName: 'BeautyFinder',
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
      creator: '@beautyfinder',
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
    redditMentions: redditMentions > 0 ? Math.round(redditMentions) : null,
    redditScale,
    redditHotnessLabel,
    redditHotness: product.content?.redditHotness || null,
    salesSpike: salesSpike && salesSpike > 0 ? Math.round(salesSpike) : null,
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
  
  // Handle redirect if this is an old slug
  if (product && (product as any)._isOldSlug && (product as any)._newSlug) {
    const { redirect } = await import('next/navigation')
    redirect(`/products/${(product as any)._newSlug}`)
  }

  if (!product || !product.content) {
    notFound()
  }

  const trendEmoji = getTrendEmoji(product.trendScore)
  const trendLabel = getTrendLabel(product.trendScore)
  const stats = getTrendStats(product)
  
  // Calculate days trending for timeline text
  const daysTrending = product.daysTrending ?? null
  const timelineText = daysTrending !== null ? getTimelineText(daysTrending) : 'Just detected'
  
  // Get Amazon star rating (only use if > 0, otherwise null)
  const amazonStarRating = (product.metadata?.starRating && product.metadata.starRating > 0) ? product.metadata.starRating : null
  
  // One-sentence verdict (from hook or generate from content)
  const verdict = product.content.hook || `${product.name} is ${product.trendScore >= 70 ? 'worth the hype' : 'trending but proceed with caution'}.`

  // Get site URL for canonical links - always use production domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'
  
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
  
  // Get product image for structured data (prefer R2 URLs, avoid Amazon URLs)
  let imageUrl = product.imageUrl
  // Only use product.imageUrl if it's an R2 URL or not an Amazon URL
  if (imageUrl && (imageUrl.includes('amazon.com') || imageUrl.includes('amazonaws'))) {
    // If imageUrl is an Amazon URL, don't use it (it might be blocked)
    imageUrl = null
  }
  // Only fallback to Amazon image if we don't have a valid imageUrl
  if (!imageUrl && product.amazonUrl) {
    const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
    if (asinMatch) {
      imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asinMatch[1]}.01._SCLZZZZZZZ_.jpg`
    }
  }

  // Structured Data (JSON-LD) for SEO
  // Google requires at least one of: offers, review, or aggregateRating
  // We'll always include offers (required), and add aggregateRating/review if available
  
  // Always include offers (required by Google)
  const offers = product.price ? {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: product.currency || 'USD',
    availability: 'https://schema.org/InStock',
    url: product.amazonUrl || undefined,
    seller: product.amazonUrl ? {
      '@type': 'Organization',
      name: 'Amazon',
    } : undefined,
  } : product.amazonUrl ? {
    // If no price but we have Amazon URL, still include offers with priceCurrency
    '@type': 'Offer',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: product.amazonUrl,
    seller: {
      '@type': 'Organization',
      name: 'Amazon',
    },
  } : {
    // Fallback: minimal offer without price (still valid)
    '@type': 'Offer',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  }

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
    offers: offers, // Always included (required by Google)
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
      name: 'BeautyFinder',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BeautyFinder',
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
      name: 'BeautyFinder',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BeautyFinder',
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
  
  // Add category if available (use new slug structure)
  if (product.category) {
    const categorySlug = getCategorySlug(product.category)
    const categoryUrl = categorySlug 
      ? `${siteUrl}/trending/${categorySlug}`
      : `${siteUrl}/trending?category=${encodeURIComponent(product.category)}`
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: product.category,
      item: categoryUrl,
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
      {/* Track page view */}
      <ProductViewTracker productId={product.id} />
      
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
      
      <div className="min-h-screen bg-[#FFFBF5]">
        {/* Header */}
        <Header />

      <article style={{ paddingTop: '1rem', paddingBottom: '5rem' }}>
        {/* Preview Banner for DRAFT products */}
        {product.status === 'DRAFT' && (
          <div style={{
            maxWidth: '1100px',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '40px',
            paddingRight: '40px',
            marginBottom: '1.5rem',
          }}>
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <p className="text-sm text-yellow-800">
                <strong>Preview Mode:</strong> This product is in DRAFT status and not yet published. 
                <Link href={`/admin/products/${product.id}/edit`} className="ml-2 underline font-medium">
                  Edit & Publish →
                </Link>
              </p>
            </div>
          </div>
        )}
        
        {/* Breadcrumb Navigation */}
        <nav style={{
          maxWidth: '1100px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '40px',
          paddingRight: '40px',
          marginBottom: '1.5rem',
        }} aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-[#6b6b6b] flex-wrap">
            <li>
              <Link href="/" className="hover:text-[#E07856] transition-colors">
                Home
              </Link>
            </li>
            <li className="text-[#b8b8b8]">/</li>
            <li>
              <Link href="/trending" className="hover:text-[#E07856] transition-colors">
                Trending Products
              </Link>
            </li>
            {product.category && (() => {
              const categorySlug = getCategorySlug(product.category)
              const categoryUrl = categorySlug 
                ? `/trending/${categorySlug}`
                : `/trending?category=${encodeURIComponent(product.category)}`
              return (
                <>
                  <li className="text-[#b8b8b8]">/</li>
                  <li>
                    <Link href={categoryUrl} className="hover:text-[#E07856] transition-colors">
                      {product.category}
                    </Link>
                  </li>
                </>
              )
            })()}
            {product.brand && (() => {
              const brandSlug = brandToSlug(product.brand)
              return (
                <>
                  <li className="text-[#b8b8b8]">/</li>
                  <li>
                    <Link href={`/brands/${brandSlug}`} className="hover:text-[#E07856] transition-colors">
                      {product.brand}
                    </Link>
                  </li>
                </>
              )
            })()}
            <li className="text-[#b8b8b8]">/</li>
            <li className="text-[#2D2D2D] font-medium" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="product-hero-section" style={{
          marginBottom: '5rem',
          maxWidth: '1100px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '40px',
          paddingRight: '40px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '60px',
            marginBottom: '3rem',
            width: '100%',
            boxSizing: 'border-box',
          }} className="product-hero-grid" suppressHydrationWarning>
            {/* Product Image */}
            <div style={{
              maxWidth: '450px',
              aspectRatio: '1 / 1',
              backgroundColor: '#FFFBF5',
              borderRadius: '16px',
              padding: '0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ProductImage 
                  imageUrl={product.imageUrl}
                  amazonUrl={product.amazonUrl}
                  productName={product.name}
                  category={product.category}
                  constrainSize={true}
                />
              </div>
            </div>

            {/* Product Info */}
            <div>
              <ProductHeroSection
                product={{ ...product, id: product.id }}
                stats={{
                  salesSpike: stats.salesSpike,
                  redditMentions: stats.redditMentions,
                  redditHotnessLabel: stats.redditHotnessLabel,
                  redditScale: stats.redditScale,
                }}
                timelineText={timelineText}
                amazonReviewCount={stats.amazonReviewCount}
                amazonStarRating={amazonStarRating}
                onAmazonClick={addAmazonAffiliateTag(product.amazonUrl) || product.amazonUrl || '#'}
              />
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <div className="content-sections-wrapper" style={{
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '40px',
          paddingRight: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3rem',
        }}>
          {/* Why It's Trending Right Now */}
          {product.content.whyTrending && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">Why It's Trending Right Now</h2>
              <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed">
                <MarkdownContent content={product.content.whyTrending || ''} />
              </div>
              
              {/* Actual Numbers - Fixed 4 Cards */}
              <div style={{
                marginTop: '48px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}>
                {/* Card 1 - Amazon Reviews */}
                <StatCard
                  number={stats.amazonReviewCount 
                    ? (stats.amazonReviewCount >= 1000 
                        ? `${(stats.amazonReviewCount / 1000).toFixed(1)}k`
                        : stats.amazonReviewCount.toString())
                    : '—'}
                  label="AMAZON REVIEWS"
                  backgroundColor="#FFF5F7"
                  numberColor="#FF6B6B"
                  labelColor="#6b6b6b"
                />
                
                {/* Card 2 - Reddit Trending */}
                <StatCard
                  number={stats.redditHotnessLabel || stats.redditScale || 'Strong'}
                  label="REDDIT TRENDING"
                  backgroundColor="#F0F4E8"
                  numberColor="#FF6B6B"
                  labelColor="#6b6b6b"
                />
                
                {/* Card 3 - Sales Spike */}
                <StatCard
                  number={stats.salesSpike ? `+${stats.salesSpike}%` : '+—%'}
                  label="SALES SPIKE"
                  backgroundColor="#E8F5F5"
                  numberColor="#FF6B6B"
                  labelColor="#6b6b6b"
                />
                
                {/* Card 4 - Google Trends (Interactive Link) */}
                <StatCard
                  number="View →"
                  label="GOOGLE TRENDS"
                  backgroundColor="#FFFBF5"
                  numberColor="#FF6B6B"
                  labelColor="#6b6b6b"
                  isLink={true}
                  href={stats.googleTrendsUrl || `https://trends.google.com/trends/explore?q=${encodeURIComponent(product.name)}`}
                />
              </div>
            </section>
          )}

          {/* What It Actually Does */}
          {product.content.whatItDoes && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">What It Actually Does</h2>
              <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed">
                <MarkdownContent content={product.content.whatItDoes || ''} />
              </div>
            </section>
          )}

          {/* The Good & The Bad */}
          <div className="grid md:grid-cols-2 gap-12">
            {product.content.theGood && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">The Good</h2>
                <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed good-list">
                  <MarkdownContent content={product.content.theGood || ''} />
                </div>
              </section>
            )}

            {product.content.theBad && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">The Bad</h2>
                <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed bad-list">
                  <MarkdownContent content={product.content.theBad || ''} />
                </div>
              </section>
            )}
          </div>

          {/* What Real Users Are Saying */}
          {product.content.whatRealUsersSay && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-8 tracking-tight">What Real Users Are Saying</h2>
              <div>
                {product.content.whatRealUsersSay.split('\n\n').filter(para => para.trim()).map((quote, index) => {
                  // Extract quote text and attribution
                  // Format can be:
                  // "Quote text" - Attribution
                  // OR
                  // "Quote text"
                  // - Attribution
                  
                  // First, normalize by removing newlines within the quote block
                  const normalized = quote.replace(/\n/g, ' ')
                  const dashIndex = normalized.lastIndexOf(' - ')
                  
                  if (dashIndex === -1) return null
                  
                  const quoteText = normalized.substring(0, dashIndex).replace(/^['""']/, '').replace(/['""']$/, '').trim()
                  const attribution = normalized.substring(dashIndex + 3).replace(/['""']$/, '').trim()
                  
                  if (!quoteText || quoteText.length < 10) return null
                  
                  return (
                    <UserQuoteCard
                      key={index}
                      quoteText={quoteText}
                      attribution={attribution}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* Who Should Try / Skip */}
          <div className="grid md:grid-cols-2 gap-12">
            {product.content.whoShouldTry && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">Who Should Try It</h2>
                <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed good-list">
                  <MarkdownContent content={product.content.whoShouldTry || ''} />
                </div>
              </section>
            )}

            {product.content.whoShouldSkip && (
              <section>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">Who Should Skip It</h2>
                <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed bad-list">
                  <MarkdownContent content={product.content.whoShouldSkip || ''} />
                </div>
              </section>
            )}
          </div>

          {/* Alternatives Worth Considering */}
          {product.content.alternatives && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">Alternatives Worth Considering</h2>
              <div className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed">
                {(await Promise.all(
                  product.content.alternatives.split('\n\n').filter(para => para.trim()).map(async (alternative, index) => {
                    // Check if this is a category header (starts with **)
                    // Format: **Category:** Product Name ($price) - description
                    const categoryMatch = alternative.match(/^\*\*([^:]+):\*\*\s+(.+?)(?:\s*\(\$|$)/)
                    
                    if (categoryMatch) {
                      const category = categoryMatch[1].trim()
                      // Extract product name - everything after category but before the price
                      const fullText = categoryMatch[2].trim()
                      const productNameMatch = fullText.match(/^(.+?)\s*\(\$[\d.,]+\)/)
                      const altProductName = productNameMatch ? productNameMatch[1].trim() : fullText.split('(')[0].trim()
                      // Extract description (everything after the price)
                      const descriptionMatch = alternative.match(/\(\$[\d.,]+\)\s*[-–]\s*(.+)$/)
                      const description = descriptionMatch ? descriptionMatch[1].trim() : ''
                      const priceMatch = alternative.match(/\$[\d.,]+/)
                      const price = priceMatch ? priceMatch[0] : ''
                      
                      // Try to find matching product in our database
                      const matchedProduct = await findProductByName(altProductName, 0.6, product.id)
                      
                      return (
                        <div key={index} style={{ marginBottom: '32px' }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#2D2D2D',
                            marginBottom: '12px',
                          }}>
                            {category}
                          </h3>
                          <AlternativeProduct
                            productName={altProductName}
                            price={price}
                            description={description}
                            matchedProduct={matchedProduct}
                          />
                        </div>
                      )
                    }
                    
                    // Try regular format without category
                    // Format: Product Name ($price) - description
                    const match = alternative.match(/^(.+?)\s*\(\$[\d.,]+\)/)
                    
                    if (match) {
                      const altProductName = match[1].trim()
                      // Extract description (everything after the price)
                      const descriptionMatch = alternative.match(/\(\$[\d.,]+\)\s*[-–]\s*(.+)$/)
                      const description = descriptionMatch ? descriptionMatch[1].trim() : ''
                      const priceMatch = alternative.match(/\$[\d.,]+/)
                      const price = priceMatch ? priceMatch[0] : ''
                      
                      // Try to find matching product in our database
                      const matchedProduct = await findProductByName(altProductName, 0.6, product.id)
                      
                      return (
                        <AlternativeProduct
                          key={index}
                          productName={altProductName}
                          price={price}
                          description={description}
                          matchedProduct={matchedProduct}
                        />
                      )
                    }
                    
                    // Fallback: render as plain markdown if format doesn't match
                    return (
                      <div key={index} style={{ marginBottom: '24px' }}>
                        <MarkdownContent content={alternative} />
                      </div>
                    )
                  })
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {product.content.faq && Array.isArray(product.content.faq) && product.content.faq.length > 0 && (
            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6 tracking-tight">FAQ</h2>
              <div className="space-y-8">
                {(product.content.faq as Array<{ question: string; answer: string }>).map((faq, index) => (
                  <div key={index} className="border-l-4 border-[#FF6B6B] pl-8 py-4 bg-white rounded-r-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-[#2D2D2D] mb-3">{faq.question}</h3>
                    <p className="prose prose-lg max-w-none text-[#2D2D2D] leading-relaxed">{faq.answer}</p>
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
            <section className="mt-20 pt-12 border-t-2 border-[#F0F0F0]">
              <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-8 tracking-tight">
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
                        <span className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-semibold text-[#FF6B6B]">
                          {getTrendEmoji(relatedProduct.trendScore)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-[#2D2D2D] mb-1 line-clamp-2 leading-tight">{relatedProduct.name}</h3>
                      {relatedProduct.brand && (
                        <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">{relatedProduct.brand}</p>
                      )}
                      {relatedProduct.price && (
                        <p className="text-base font-bold text-[#2D2D2D]" style={{ fontFamily: 'var(--font-atkinson)' }}>${relatedProduct.price.toFixed(2)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 pt-12 border-t border-[#F0F0F0] text-center">
          <p className="text-[#6b6b6b] mb-4 font-light">Found this helpful? Check out more trending products.</p>
          <Link 
            href="/"
            className="inline-block text-[#FF6B6B] font-medium hover:text-[#E07856] transition-colors"
          >
            ← Back to Trending Dashboard
          </Link>
        </div>
      </article>

      <Footer />
      </div>
    </>
  )
}

