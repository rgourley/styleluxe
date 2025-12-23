/**
 * Backfill Amazon reviews for existing products
 * Scrapes reviews and updates product content with formatted quotes
 */

import { prisma } from '../lib/prisma'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'
import { formatReviewQuotes, formatQuotesAsMarkdown } from '../lib/format-review-quotes'

async function backfillReviews() {
  console.log('='.repeat(60))
  console.log('Starting review backfill for existing products...')
  console.log('='.repeat(60))
  console.log()

  // Find all products that have:
  // 1. An Amazon URL
  // 2. Generated content (have a ProductContent record)
  // 3. Fewer than 5 Amazon reviews
  const products = await prisma.product.findMany({
    where: {
      amazonUrl: { not: null },
      content: { isNot: null },
    },
    include: {
      reviews: {
        where: { source: 'AMAZON' },
      },
      content: true,
    },
  })

  console.log(`Found ${products.length} products with Amazon URLs and generated content`)
  console.log()

  let processed = 0
  let updated = 0
  let errors = 0

  for (const product of products) {
    try {
      // Skip if already has 5+ reviews
      if (product.reviews.length >= 5) {
        console.log(`⏭️  Skipping "${product.name}" - already has ${product.reviews.length} reviews`)
        continue
      }

      if (!product.amazonUrl) {
        console.log(`⏭️  Skipping "${product.name}" - no Amazon URL`)
        continue
      }

      console.log(`📦 Processing: ${product.name}`)
      console.log(`   Amazon URL: ${product.amazonUrl}`)
      console.log(`   Current reviews: ${product.reviews.length}`)

      // Scrape Amazon reviews
      let scrapedProduct
      try {
        scrapedProduct = await scrapeAmazonProductPage(product.amazonUrl)
      } catch (scrapeError) {
        console.error(`   ❌ Error scraping Amazon page:`, scrapeError)
        errors++
        console.log()
        continue
      }

      if (!scrapedProduct) {
        console.log(`   ❌ Failed to scrape product page`)
        console.log()
        errors++
        continue
      }

      if (!scrapedProduct.reviews || scrapedProduct.reviews.length === 0) {
        console.log(`   ⚠️  No reviews found (product page scraped successfully but no reviews)`)
        console.log(`   This could mean: reviews aren't available, Amazon blocked the request, or the product has no reviews`)
        console.log()
        // Don't count this as an error - it's just that reviews aren't available
        continue
      }

      console.log(`   ✅ Found ${scrapedProduct.reviews.length} reviews`)

      // Save reviews to database
      let savedCount = 0
      for (const review of scrapedProduct.reviews.slice(0, 20)) {
        // Check if review already exists (by content hash or similar)
        const existingReview = await prisma.review.findFirst({
          where: {
            productId: product.id,
            source: 'AMAZON',
            content: review.content.substring(0, 200), // Check first 200 chars
          },
        })

        if (!existingReview) {
          await prisma.review.create({
            data: {
              productId: product.id,
              source: 'AMAZON',
              rating: review.rating,
              title: review.title,
              content: review.content,
              author: review.author,
              date: review.date,
              helpful: review.helpful,
              verified: review.verified || false,
            },
          })
          savedCount++
        }
      }

      console.log(`   💾 Saved ${savedCount} new reviews`)

      // Fetch updated reviews
      const updatedReviews = await prisma.review.findMany({
        where: {
          productId: product.id,
          source: 'AMAZON',
        },
      })

      // Format quotes
      const formattedQuotes = formatReviewQuotes(updatedReviews as any)
      const quotesMarkdown = formatQuotesAsMarkdown(formattedQuotes)

      if (quotesMarkdown && product.content) {
        // Update the "What Real Users Say" section with formatted quotes
        // We'll update the content directly
        const updatedContent = {
          ...product.content,
          whatRealUsersSay: quotesMarkdown,
        }

        await prisma.productContent.update({
          where: { id: product.content.id },
          data: {
            whatRealUsersSay: quotesMarkdown,
            updatedAt: new Date(),
          },
        })

        console.log(`   ✨ Updated "What Real Users Say" section with ${formattedQuotes.length} formatted quotes`)
        updated++
      } else if (!quotesMarkdown) {
        console.log(`   ⚠️  No quotes to format (need at least 5 reviews)`)
      }

      processed++
      console.log()

      // Rate limiting - wait 2 seconds between products to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`   ❌ Error processing "${product.name}":`, error)
      errors++
      console.log()
    }
  }

  console.log('='.repeat(60))
  console.log('Backfill complete!')
  console.log(`Processed: ${processed}`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors: ${errors}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (require.main === module) {
  backfillReviews()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { backfillReviews }

