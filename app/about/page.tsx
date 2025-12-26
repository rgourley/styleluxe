import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thestyleluxe.com'

export const metadata: Metadata = {
  title: 'About Us - BeautyFinder',
  description: 'Learn about BeautyFinder and how we track trending beauty products across TikTok, Instagram, Reddit, and Amazon to bring you honest, data-driven reviews.',
  alternates: {
    canonical: `${siteUrl}/about`,
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <Header />

      <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            About BeautyFinder
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
              BeautyFinder cuts through the noise by tracking real data from TikTok, Instagram, Reddit, and Amazon 
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

      <Footer />
    </div>
  )
}

