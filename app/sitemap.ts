import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Always use production domain for sitemap URLs
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'
  
  // Use fixed date for static pages to prevent hydration issues
  const now = new Date('2025-01-01') // Fixed date for build consistency

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic product pages - lazy load prisma to prevent build errors
  try {
    // Only try to connect if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL not available, returning static sitemap only')
      return staticPages
    }
    
    // Lazy import prisma to prevent build-time connection attempts
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
          select: {
            slug: true,
            updatedAt: true,
          },
        },
      },
      take: 1000, // Limit to 1000 products for sitemap
    })

    const productPages: MetadataRoute.Sitemap = products
      .filter(p => p.content?.slug)
      .map(product => ({
        url: `${baseUrl}/products/${product.content!.slug}`,
        lastModified: product.content!.updatedAt || product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))

    return [...staticPages, ...productPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return static pages only if database query fails
    // This is safe during build - sitemap will still work with static pages
    return staticPages
  }
}

