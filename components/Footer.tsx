import Link from 'next/link'
import { getAllBrands } from '@/lib/brands'

export default async function Footer() {
  const currentYear = new Date().getFullYear()
  
  // Get top brands for footer (limit to 12 most popular)
  const brands = await getAllBrands()
  const topBrands = brands.slice(0, 12)

  return (
    <footer className="border-t border-[#F0F0F0] mt-24 bg-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
          {/* Brand Column */}
          <div className="mb-6 sm:mb-0">
            <Link 
              href="/" 
              className="mb-3 sm:mb-4 inline-block"
              style={{
                fontFamily: 'var(--font-playfair), serif',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#2D2D2D',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              BeautyFinder
            </Link>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">
              Discover trending beauty products from TikTok, Instagram, Reddit, and Amazon.
            </p>
          </div>

          {/* Pages Column */}
          <div className="mb-6 sm:mb-0">
            <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3 sm:mb-4 tracking-wide uppercase">Pages</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Trending Products
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/brands" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Brands
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Brands Column */}
          <div className="mb-6 sm:mb-0">
            <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3 sm:mb-4 tracking-wide uppercase">Brands</h3>
            {topBrands.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-3">
                {topBrands.map((brand) => (
                  <Link 
                    key={brand.slug}
                    href={`/brands/${brand.slug}`} 
                    className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors block"
                  >
                    {brand.brand}
                  </Link>
                ))}
                {brands.length > 12 && (
                  <Link 
                    href="/brands" 
                    className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors font-medium col-span-2"
                  >
                    View All Brands →
                  </Link>
                )}
              </div>
            ) : (
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <Link 
                    href="/brands" 
                    className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors"
                  >
                    View All Brands
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* Legal Column */}
          <div className="mb-6 sm:mb-0">
            <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3 sm:mb-4 tracking-wide uppercase">Legal</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-[#6b6b6b] hover:text-[#E07856] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-[#F0F0F0] text-center space-y-2">
          <p className="text-xs text-[#8b8b8b] leading-relaxed max-w-2xl mx-auto px-4">
            We may earn affiliate commissions when you purchase products through our Amazon links. This never influences which products we feature or how we review them.
          </p>
          <p className="text-xs text-[#8b8b8b] tracking-wider uppercase">
            © {currentYear} BeautyFinder. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

