import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata: Metadata = {
  title: 'Terms of Service - StyleLuxe',
  description: 'StyleLuxe Terms of Service. Please read these terms carefully before using our website.',
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-[#8b8b8b] tracking-wide uppercase">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-[#4a4a4a] leading-relaxed">
          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Agreement to Terms</h2>
            <p>
              By accessing or using StyleLuxe, you agree to be bound by these Terms of Service and all applicable 
              laws and regulations. If you do not agree with any of these terms, you are prohibited from using 
              or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Use License</h2>
            <p>
              Permission is granted to temporarily access the materials on StyleLuxe for personal, non-commercial 
              transitory viewing only. This is the grant of a license, not a transfer of title, and under this 
              license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Disclaimer</h2>
            <p>
              The materials on StyleLuxe are provided on an 'as is' basis. StyleLuxe makes no warranties, expressed 
              or implied, and hereby disclaims and negates all other warranties including, without limitation, 
              implied warranties or conditions of merchantability, fitness for a particular purpose, or 
              non-infringement of intellectual property or other violation of rights.
            </p>
            <p>
              Further, StyleLuxe does not warrant or make any representations concerning the accuracy, likely 
              results, or reliability of the use of the materials on its website or otherwise relating to such 
              materials or on any sites linked to this site.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Limitations</h2>
            <p>
              In no event shall StyleLuxe or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or 
              inability to use the materials on StyleLuxe, even if StyleLuxe or a StyleLuxe authorized 
              representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Accuracy of Materials</h2>
            <p>
              The materials appearing on StyleLuxe could include technical, typographical, or photographic errors. 
              StyleLuxe does not warrant that any of the materials on its website are accurate, complete, or current. 
              StyleLuxe may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Links</h2>
            <p>
              StyleLuxe has not reviewed all of the sites linked to its website and is not responsible for the 
              contents of any such linked site. The inclusion of any link does not imply endorsement by StyleLuxe 
              of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Affiliate Disclosure</h2>
            <p>
              StyleLuxe participates in affiliate marketing programs, including the Amazon Associates Program. 
              This means we may earn commissions from qualifying purchases made through our affiliate links. 
              This does not affect the price you pay or our editorial independence.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Modifications</h2>
            <p>
              StyleLuxe may revise these terms of service for its website at any time without notice. By using 
              this website you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with applicable laws and 
              you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please{' '}
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

