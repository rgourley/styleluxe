import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata: Metadata = {
  title: 'Terms of Service - BeautyFinder',
  description: 'BeautyFinder Terms of Service. Please read these terms carefully before using our website.',
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <Header />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-[#8b8b8b] tracking-wide uppercase">
            Last updated: December 24, 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-[#4a4a4a] leading-relaxed">
          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Agreement to Terms</h2>
            <p>
              By accessing or using BeautyFinder, you agree to be bound by these Terms of Service and all applicable 
              laws and regulations. If you do not agree with any of these terms, you are prohibited from using 
              or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Use License</h2>
            <p>
              Permission is granted to temporarily access the materials on BeautyFinder for personal, non-commercial 
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
              The materials on BeautyFinder are provided on an 'as is' basis. BeautyFinder makes no warranties, expressed 
              or implied, and hereby disclaims and negates all other warranties including, without limitation, 
              implied warranties or conditions of merchantability, fitness for a particular purpose, or 
              non-infringement of intellectual property or other violation of rights.
            </p>
            <p>
              Further, BeautyFinder does not warrant or make any representations concerning the accuracy, likely 
              results, or reliability of the use of the materials on its website or otherwise relating to such 
              materials or on any sites linked to this site.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Limitations</h2>
            <p>
              In no event shall BeautyFinder or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or 
              inability to use the materials on BeautyFinder, even if BeautyFinder or a BeautyFinder authorized 
              representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Accuracy of Materials</h2>
            <p>
              The materials appearing on BeautyFinder could include technical, typographical, or photographic errors.
              BeautyFinder does not warrant that any of the materials on its website are accurate, complete, or current.
              BeautyFinder may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Links</h2>
            <p>
              BeautyFinder has not reviewed all of the sites linked to its website and is not responsible for the
              contents of any such linked site. The inclusion of any link does not imply endorsement by BeautyFinder
              of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Affiliate Disclosure</h2>
            <p>
              BeautyFinder participates in affiliate marketing programs, including the Amazon Associates Program. 
              This means we may earn commissions from qualifying purchases made through our affiliate links. 
              This does not affect the price you pay or our editorial independence.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-[#2D2D2D] mb-4 tracking-tight">Modifications</h2>
            <p>
              BeautyFinder may revise these terms of service for its website at any time without notice. By using 
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

      <Footer />
    </div>
  )
}

