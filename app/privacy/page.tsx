import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata: Metadata = {
  title: 'Privacy Policy - StyleLuxe',
  description: 'StyleLuxe Privacy Policy. Learn how we collect, use, and protect your personal information.',
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <Header />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#8b8b8b] tracking-wide uppercase">
            Last updated: December 24, 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-[#4a4a4a] leading-relaxed">
          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Introduction</h2>
            <p>
              StyleLuxe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you visit our website.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">Information You Provide</h3>
                <p>
                  We may collect information that you voluntarily provide to us when you contact us, subscribe 
                  to our newsletter, or interact with our website.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">Automatically Collected Information</h3>
                <p>
                  When you visit our website, we may automatically collect certain information about your device, 
                  including information about your web browser, IP address, time zone, and some of the cookies 
                  that are installed on your device.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Send you technical notices and support messages</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our website and hold certain 
              information. You can instruct your browser to refuse all cookies or to indicate when a cookie is 
              being sent.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Third-Party Services</h2>
            <p>
              We may use third-party services that collect, monitor, and analyze information. These services may 
              include analytics providers and advertising networks. We are not responsible for the privacy practices 
              of these third parties.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Affiliate Links</h2>
            <p>
              Our website contains affiliate links to Amazon and other retailers. When you click on these links 
              and make a purchase, we may receive a commission. This does not affect the price you pay or our 
              editorial independence.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Request restriction of processing your personal information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal 
              information. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please{' '}
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

