import { notFound } from 'next/navigation'
import { getProductsByBrand, getBrandNameFromSlug, brandToSlug } from '@/lib/brands'
import { getAllBrands } from '@/lib/brands'
import ProductCard from '@/components/ProductCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

// Revalidate every 60 seconds to show new products
export const revalidate = 60

export async function generateStaticParams() {
  try {
    const brands = await getAllBrands()
    return brands.map((brand) => ({
      brand: brand.slug,
    }))
  } catch (error) {
    console.error('Error generating brand static params:', error)
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandSlug } = await params
  const brandName = await getBrandNameFromSlug(brandSlug)

  if (!brandName) {
    return {
      title: 'Brand Not Found',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'
  const brandUrl = `${siteUrl}/brands/${brandSlug}`

  // Get products to count
  const products = await getProductsByBrand(brandName, 1)
  const productCount = products.length

  const title = `${brandName} Products - Trending Beauty Reviews`
  const description = `Discover trending ${brandName} products with honest reviews. Real data from Amazon, Reddit, and social media. Find the best ${brandName} products worth buying.`

  return {
    title,
    description,
    alternates: {
      canonical: brandUrl,
    },
    openGraph: {
      title,
      description,
      url: brandUrl,
      siteName: 'BeautyFinder',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/images/unsplash-image-4nulm-JUYFo.webp`,
          width: 1200,
          height: 630,
          alt: `${brandName} Products`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/images/unsplash-image-4nulm-JUYFo.webp`],
    },
  }
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandSlug } = await params
  const brandName = await getBrandNameFromSlug(brandSlug)

  if (!brandName) {
    notFound()
  }

  const products = await getProductsByBrand(brandName, 100)

  if (products.length === 0) {
    notFound()
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
        {/* Hero Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F0F0F0',
          paddingTop: '2rem',
          paddingBottom: '2rem',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
          }}>
            {/* Breadcrumbs */}
            <nav style={{
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#6b6b6b',
            }}>
              <Link href="/" style={{ color: '#6b6b6b', textDecoration: 'none' }}>
                Home
              </Link>
              <span style={{ margin: '0 0.5rem' }}> / </span>
              <Link href="/brands" style={{ color: '#6b6b6b', textDecoration: 'none' }}>
                Brands
              </Link>
              <span style={{ margin: '0 0.5rem' }}> / </span>
              <span style={{ color: '#2D2D2D' }}>{brandName}</span>
            </nav>

            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#2D2D2D',
              marginBottom: '0.5rem',
              lineHeight: '1.2',
            }}>
              {brandName} Products
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: '#6b6b6b',
              marginBottom: '1rem',
            }}>
              Discover trending {brandName} products with honest reviews. Real data from Amazon, Reddit, and social media.
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: '#8b8b8b',
            }}>
              {products.length} {products.length === 1 ? 'product' : 'products'} reviewed
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}>
          {products.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '2rem',
            }}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
            }}>
              <p style={{
                fontSize: '1.125rem',
                color: '#6b6b6b',
              }}>
                No products found for {brandName}.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

