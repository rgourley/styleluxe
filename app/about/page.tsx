import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata: Metadata = {
  title: 'About Us - StyleLuxe',
  description: 'Learn about StyleLuxe and how we track trending beauty products across TikTok, Instagram, Reddit, and Amazon to bring you honest, data-driven reviews.',
  alternates: {
    canonical: `${siteUrl}/about`,
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-3xl font-bold tracking-tight">
              <span className="text-[#2D2D2D]">Style</span><span style={{ color: '#A8D5BA' }}>Luxe</span>
            </Link>
            <nav className="hidden md:flex space-x-10">
              <Link href="/" className="text-[#4a4a4a] hover:text-[#2D2D2D] font-medium text-sm tracking-wide transition-colors">
                Trending
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            About StyleLuxe
          </h1>
          <p className="text-xl text-[#4a4a4a] font-light leading-relaxed">
            We track what's actually trending, not what brands want you to think is trending.
          </p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-[#4a4a4a] leading-relaxed">
          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Our Mission</h2>
            <p>
              In a world where beauty marketing is everywhere, it's hard to know what's actually worth your money. 
              StyleLuxe cuts through the noise by tracking real data from TikTok, Instagram, Reddit, and Amazon 
              to identify products that are genuinely trending—not just heavily promoted.
            </p>
            <p>
              We create honest, data-driven reviews that tell you what's actually good, what's overhyped, and 
              who should (or shouldn't) try each product. No marketing speak, no fake reviews, just real insights 
              from real users.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">How We Work</h2>
            <p>
              Our system monitors multiple platforms 24/7 to identify trending beauty products:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>TikTok</strong> - Viral beauty videos and trending hashtags</li>
              <li><strong>Instagram</strong> - Influencer mentions and beauty community discussions</li>
              <li><strong>Reddit</strong> - Real conversations in r/SkincareAddiction, r/MakeupAddiction, and other beauty communities</li>
              <li><strong>Amazon</strong> - Sales spikes, Movers & Shakers lists, and review trends</li>
            </ul>
            <p>
              When a product shows significant activity across these platforms, we dive deep: analyzing verified 
              purchase reviews, ingredient lists, price comparisons, and real user experiences. Then we create 
              comprehensive reviews that help you make informed decisions.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Our Values</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">Honesty First</h3>
                <p>
                  We'll tell you if something isn't worth it, even if we have an affiliate link. Our credibility 
                  is more important than any commission.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">Data-Driven</h3>
                <p>
                  We don't rely on press releases or brand claims. We analyze real sales data, verified reviews, 
                  and social media trends to identify what's actually happening.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">No Hype</h3>
                <p>
                  We cut through marketing language to give you straight talk. If something is "revolutionary" 
                  or "game-changing," we'll tell you why—or why it's not.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Transparency</h2>
            <p>
              We may earn affiliate commissions when you purchase products through our Amazon links. This never 
              influences which products we feature or how we review them. We only feature products that are 
              genuinely trending, and our reviews are honest assessments based on real data.
            </p>
            <p>
              If you have questions about our process or want to suggest a product to review, please{' '}
              <Link href="/contact" className="text-[#FF6B6B] hover:text-[#E07856] underline">
                contact us
              </Link>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div>
              <Link href="/" className="text-2xl font-bold tracking-tight mb-4 inline-block">
                <span className="text-[#2D2D2D]">Style</span><span style={{ color: '#A8D5BA' }}>Luxe</span>
              </Link>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">
                Tracking trending beauty products from TikTok, Instagram, Reddit, and Amazon.
              </p>
            </div>

            {/* Pages Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4 tracking-wide uppercase">Pages</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    Trending Products
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4 tracking-wide uppercase">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-[var(--secondary-link-color)] hover:text-[var(--secondary-link-hover)] transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Info Column */}
            <div>
              <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4 tracking-wide uppercase">Info</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed mb-4">
                Real data. Honest reviews. No hype.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e5e5e5] text-center">
            <p className="text-xs text-[#8b8b8b] tracking-wider uppercase">
              © {2025} StyleLuxe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

