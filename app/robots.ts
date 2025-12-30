import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Always use production domain for robots.txt
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
          '/products/*/edit',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

