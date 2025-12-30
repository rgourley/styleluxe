import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions About Trending Beauty Products',
  description: 'Answers to common questions about how we track trending beauty products, our review process, and what makes products go viral on TikTok, Instagram, Reddit, and Amazon.',
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
}

export default function FAQPage() {
  const faqs = [
    {
      question: 'What makes a beauty product "trending"?',
      answer: 'A product is considered trending when it shows significant activity across multiple platforms. This includes sales spikes on Amazon, viral TikTok videos, Instagram influencer mentions, and active Reddit discussions. We combine data from all these sources to identify products that are genuinely gaining momentum, not just being promoted by brands.',
    },
    {
      question: 'How often do you update the trending products list?',
      answer: 'We update our trending beauty products list daily. Our system continuously monitors TikTok, Instagram, Reddit, and Amazon for new signals. Products that show sustained trending activity get featured on our homepage, while new viral products are added as soon as they\'re detected.',
    },
    {
      question: 'Are trending beauty products worth buying?',
      answer: 'Not always. That\'s why we create honest reviews for each trending product. We analyze real user reviews from Amazon and Reddit, look at verified purchase data, and test products when possible. Our reviews tell you what\'s actually good, what\'s overhyped, and who should (or shouldn\'t) try each product. Just because something is trending doesn\'t mean it\'s right for everyone.',
    },
    {
      question: 'How do you track products on TikTok and Instagram?',
      answer: 'We monitor beauty-related hashtags, viral video trends, and influencer mentions on TikTok and Instagram. When a product appears frequently in viral beauty content or gets mentioned by multiple influencers, it\'s flagged as trending. We combine this social media data with sales data from Amazon and discussions on Reddit to get a complete picture.',
    },
    {
      question: 'What types of beauty products do you track?',
      answer: 'We track all types of trending beauty products including skincare (cleansers, serums, moisturizers, sunscreens), makeup (foundation, concealer, lip products, eyeshadow), hair care, and beauty tools. If it\'s trending on TikTok, Instagram, Reddit, or Amazon, we\'ll track it and create a review.',
    },
    {
      question: 'Can I search for specific trending products?',
      answer: 'Yes! Use the search bar at the top of the page to find specific products. You can also filter by category (skincare, makeup, hair care, etc.) to see trending products in that category. Each product page includes detailed reviews, real user quotes, and honest assessments of whether it\'s worth the hype.',
    },
    {
      question: 'How do you determine if a product is worth the hype?',
      answer: 'We analyze multiple data points: verified purchase reviews on Amazon, real user discussions on Reddit, ingredient analysis, price comparisons, and when possible, hands-on testing. Our reviews are honest about both the positives and negatives, helping you make informed decisions.',
    },
    {
      question: 'Do you get paid to promote products?',
      answer: 'We may earn affiliate commissions when you purchase products through our Amazon links, but this never influences our reviews. We only feature products that are genuinely trending, and our reviews are honest assessments based on real data and user experiences. We\'ll always tell you if something isn\'t worth it, even if we have an affiliate link.',
    },
    {
      question: 'How can I suggest a product to review?',
      answer: 'If you notice a product trending that we haven\'t covered yet, you can reach out through our contact page. We prioritize products that show strong signals across multiple platforms, so if something is genuinely going viral, we\'ll likely catch it in our tracking system.',
    },
    {
      question: 'Are your reviews written by humans or AI?',
      answer: 'Our reviews combine the best of both: AI helps us analyze large amounts of data quickly, but all content is reviewed and edited by our team to ensure accuracy and authenticity. We use real user reviews, verified purchase data, and honest assessments to create helpful, trustworthy reviews.',
    },
  ]

  // Structured data for SEO
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      <div className="min-h-screen bg-[#FFFBF5]">
        {/* Header */}
        <Header />

        <main className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-[#4a4a4a] font-light leading-relaxed">
              Everything you need to know about how we track and review trending beauty products.
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="border-l-4 border-[#FF6B6B] pl-8 py-4 bg-white rounded-r-lg shadow-sm">
                <h2 className="text-xl font-semibold text-[#2D2D2D] mb-3">{faq.question}</h2>
                <p className="text-[#4a4a4a] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-12 border-t border-[#e5e5e5]">
            <p className="text-[#6b6b6b] mb-4">Still have questions?</p>
            <Link 
              href="/contact" 
              className="text-[#FF6B6B] hover:text-[#E07856] font-medium transition-colors"
            >
              Contact us →
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

