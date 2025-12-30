import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

export const metadata: Metadata = {
  title: 'Contact Us - BeautyFinder',
  description: 'Get in touch with BeautyFinder. Have a question, suggestion, or want to report an issue? We\'d love to hear from you.',
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <Header />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            Contact Us
          </h1>
          <p className="text-xl text-[#4a4a4a] font-light leading-relaxed">
            Have a question, suggestion, or want to report an issue? We'd love to hear from you.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-[#e5e5e5]">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-[#2D2D2D] mb-4">Get in Touch</h2>
              <p className="text-[#4a4a4a] leading-relaxed mb-6">
                We're always looking to improve and would love to hear your feedback. Whether you have a 
                question about how we track products, want to suggest a trending product to review, or 
                have found an issue with our site, please reach out.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">Email</h3>
                <p className="text-[#4a4a4a]">
                  <a 
                    href="mailto:hello@beautyfinder.com" 
                    className="text-[#FF6B6B] hover:text-[#E07856] underline"
                  >
                    hello@beautyfinder.com
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">What We Can Help With</h3>
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
          <h2 className="text-2xl font-semibold text-[#2D2D2D] mb-4">Before You Contact Us</h2>
          <p className="text-[#4a4a4a] mb-4">
            You might find the answer to your question in our{' '}
            <Link href="/faq" className="text-[#FF6B6B] hover:text-[#E07856] underline">
              FAQ page
            </Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

