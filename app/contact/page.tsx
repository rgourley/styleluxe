import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://styleluxe.com')

export const metadata: Metadata = {
  title: 'Contact Us - StyleLuxe',
  description: 'Get in touch with StyleLuxe. Have a question, suggestion, or want to report an issue? We\'d love to hear from you.',
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-3xl font-bold tracking-tight">
              <span className="text-[#1a1a1a]">Style</span><span className="text-[#8b5cf6]">Luxe</span>
            </Link>
            <nav className="hidden md:flex space-x-10">
              <Link href="/" className="text-[#4a4a4a] hover:text-[#1a1a1a] font-medium text-sm tracking-wide transition-colors">
                Trending
              </Link>
              <Link href="/admin" className="text-[#8b8b8b] hover:text-[#4a4a4a] text-sm tracking-wide transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
            Contact Us
          </h1>
          <p className="text-xl text-[#4a4a4a] font-light leading-relaxed">
            Have a question, suggestion, or want to report an issue? We'd love to hear from you.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-[#e5e5e5]">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">Get in Touch</h2>
              <p className="text-[#4a4a4a] leading-relaxed mb-6">
                We're always looking to improve and would love to hear your feedback. Whether you have a 
                question about how we track products, want to suggest a trending product to review, or 
                have found an issue with our site, please reach out.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">Email</h3>
                <p className="text-[#4a4a4a]">
                  <a 
                    href="mailto:hello@styleluxe.com" 
                    className="text-[#8b5cf6] hover:text-[#7c3aed] underline"
                  >
                    hello@styleluxe.com
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">What We Can Help With</h3>
                <ul className="list-disc list-inside space-y-2 text-[#4a4a4a] ml-4">
                  <li>Questions about our review process</li>
                  <li>Suggestions for products to review</li>
                  <li>Reporting errors or issues</li>
                  <li>Partnership inquiries</li>
                  <li>General feedback</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-[#e5e5e5]">
                <p className="text-sm text-[#6b6b6b]">
                  We typically respond within 24-48 hours. For urgent matters, please include "URGENT" 
                  in your subject line.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-4">Before You Contact Us</h2>
          <p className="text-[#4a4a4a] mb-4">
            You might find the answer to your question in our{' '}
            <Link href="/faq" className="text-[#8b5cf6] hover:text-[#7c3aed] underline">
              FAQ page
            </Link>.
          </p>
        </div>
      </main>

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
  )
}

