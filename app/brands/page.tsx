import { getAllBrands } from '@/lib/brands'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export async function generateMetadata() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

  return {
    title: 'Beauty Brands - All Trending Brand Products',
    description: 'Browse trending beauty products by brand. Find honest reviews for CeraVe, The Ordinary, La Roche-Posay, and more.',
    alternates: {
      canonical: `${siteUrl}/brands`,
    },
    openGraph: {
      title: 'Beauty Brands - All Trending Brand Products',
      description: 'Browse trending beauty products by brand. Find honest reviews for top beauty brands.',
      url: `${siteUrl}/brands`,
      siteName: 'BeautyFinder',
      type: 'website',
    },
  }
}

export default async function BrandsPage() {
  const brands = await getAllBrands()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
        {/* Hero Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F0F0F0',
          paddingTop: '3rem',
          paddingBottom: '3rem',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#2D2D2D',
              marginBottom: '0.5rem',
              lineHeight: '1.2',
            }}>
              Beauty Brands
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: '#6b6b6b',
              marginBottom: '1rem',
            }}>
              Browse trending beauty products by brand. Find honest reviews for your favorite beauty brands.
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: '#8b8b8b',
            }}>
              {brands.length} {brands.length === 1 ? 'brand' : 'brands'} with reviewed products
            </p>
          </div>
        </div>

        {/* Brands Grid */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}>
          {brands.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}>
              {brands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="block bg-white border border-[#F0F0F0] rounded-2xl p-6 no-underline transition-all duration-300 hover:bg-[#FFF5F7] hover:shadow-lg hover:-translate-y-0.5"
                >
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#2D2D2D',
                    marginBottom: '0.5rem',
                  }}>
                    {brand.brand}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b6b6b',
                  }}>
                    {brand.count} {brand.count === 1 ? 'product' : 'products'}
                  </p>
                </Link>
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
                No brands found.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

