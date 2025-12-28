/**
 * Scrape detailed Amazon product data for flagged products
 * Includes reviews, Q&A, and metadata
 */

import { prisma } from '../lib/prisma'
import { scrapeAmazonProductPage, extractReviewThemes } from '../lib/amazon-product-scraper'

async function scrapeProductData() {
  console.log('='.repeat(60))
  console.log('Scraping Amazon Product Data for Flagged Products')
  console.log('='.repeat(60))
  console.log()

  // Get all flagged products with Amazon URLs
  // Note: metadata is not included here because it might not exist until schema is synced
  const products = await prisma.product.findMany({
    where: {
      status: 'FLAGGED',
      amazonUrl: { not: null },
    },
    include: {
      reviews: true,
    },
  })
  
  // Fetch metadata separately if it exists
  const productsWithMetadata = await Promise.all(
    products.map(async (product) => {
      try {
        // @ts-ignore - ProductMetadata might not exist in Prisma client yet
        if (prisma.productMetadata) {
          // @ts-ignore
          const metadata = await prisma.productMetadata.findUnique({
            where: { productId: product.id },
          })
          return { ...product, metadata }
        }
      } catch (error) {
        // Metadata table doesn't exist yet
      }
      return { ...product, metadata: null }
    })
  )

  console.log(`Found ${productsWithMetadata.length} flagged products with Amazon URLs\n`)

  let scraped = 0
  let updated = 0
  let errors = 0

  for (const product of productsWithMetadata) {
    if (!product.amazonUrl) continue

    console.log(`Scraping: ${product.name}`)
    console.log(`  URL: ${product.amazonUrl}`)

    try {
      // Scrape product page
      const productData = await scrapeAmazonProductPage(product.amazonUrl)

      if (!productData) {
        console.log(`  ❌ Failed to scrape product page\n`)
        errors++
        continue
      }

      console.log(`  ✓ Scraped product data`)
      console.log(`    Rating: ${productData.starRating || 'N/A'} stars`)
      console.log(`    Reviews: ${productData.totalReviewCount || 'N/A'}`)
      console.log(`    Availability: ${productData.availability || 'N/A'}`)

      // Store image in R2 if we have one and it's from Amazon
      let finalImageUrl = productData.imageUrl || product.imageUrl
      if (productData.imageUrl && (productData.imageUrl.includes('amazon.com') || productData.imageUrl.includes('media-amazon'))) {
        try {
          const { storeAmazonImageInR2, extractASINFromUrl } = await import('../lib/image-storage')
          const asin = productData.asin || extractASINFromUrl(product.amazonUrl || '')
          const r2ImageUrl = await storeAmazonImageInR2(productData.imageUrl, product.id, asin || undefined)
          if (r2ImageUrl) {
            finalImageUrl = r2ImageUrl
            console.log(`    ✓ Stored image in R2: ${r2ImageUrl}`)
          } else {
            console.log(`    ⚠️ Failed to store image in R2, using original URL`)
          }
        } catch (error) {
          console.error(`    ⚠️ Error storing image in R2:`, error)
          // Continue with original URL if R2 upload fails
        }
      }

      // Update product with latest price and image if available
      if (productData.price || finalImageUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            price: productData.price || product.price,
            imageUrl: finalImageUrl || product.imageUrl,
          },
        })
      }

      // Store or update metadata (only if ProductMetadata model exists)
      try {
        const metadataData = {
          starRating: productData.starRating,
          totalReviewCount: productData.totalReviewCount,
          availability: productData.availability,
          description: productData.description,
          keyFeatures: productData.keyFeatures || [],
        }

        // @ts-ignore - ProductMetadata might not exist in Prisma client yet
        if (product.metadata && prisma.productMetadata) {
          // @ts-ignore
          await prisma.productMetadata.update({
            where: { id: product.metadata.id },
            data: metadataData,
          })
        } else if (prisma.productMetadata) {
          // @ts-ignore
          await prisma.productMetadata.create({
            data: {
              productId: product.id,
              ...metadataData,
            },
          })
        } else {
          console.log('    ⚠️ ProductMetadata model not available - schema may need syncing')
        }
      } catch (metadataError: any) {
        if (metadataError.message?.includes('Unknown model') || metadataError.message?.includes('ProductMetadata')) {
          console.log('    ⚠️ ProductMetadata table not found - please sync schema first')
        } else {
          throw metadataError
        }
      }

      // Extract review themes if we have reviews
      if (productData.reviews && productData.reviews.length > 0) {
        const themes = extractReviewThemes(productData.reviews)

        try {
          // @ts-ignore - ProductMetadata might not exist in Prisma client yet
          if (prisma.productMetadata) {
            const metadataData = {
              starRating: productData.starRating,
              totalReviewCount: productData.totalReviewCount,
              availability: productData.availability,
              description: productData.description,
              keyFeatures: productData.keyFeatures || [],
            }

            // @ts-ignore
            await prisma.productMetadata.upsert({
              where: { productId: product.id },
              create: {
                productId: product.id,
                ...metadataData,
                positiveThemes: themes.positiveThemes,
                negativeThemes: themes.negativeThemes,
                specificDetails: themes.specificDetails,
                memorableQuotes: themes.memorableQuotes,
              },
              update: {
                positiveThemes: themes.positiveThemes,
                negativeThemes: themes.negativeThemes,
                specificDetails: themes.specificDetails,
                memorableQuotes: themes.memorableQuotes,
              },
            })

            console.log(`    Positive themes: ${themes.positiveThemes.length}`)
            console.log(`    Negative themes: ${themes.negativeThemes.length}`)
            console.log(`    Memorable quotes: ${themes.memorableQuotes.length}`)
          }
        } catch (themeError: any) {
          if (themeError.message?.includes('Unknown model') || themeError.message?.includes('ProductMetadata')) {
            console.log('    ⚠️ ProductMetadata table not found - skipping theme extraction')
          } else {
            throw themeError
          }
        }
      }

      // Store reviews (avoid duplicates)
      if (productData.reviews && productData.reviews.length > 0) {
        const existingReviewTitles = new Set(
          product.reviews.map(r => r.title?.toLowerCase() || '')
        )

        let newReviews = 0
        for (const review of productData.reviews) {
          // Check if review already exists (by title or content snippet)
          const contentSnippet = review.content.substring(0, 100)
          const exists = product.reviews.some(
            r => r.title?.toLowerCase() === review.title?.toLowerCase() ||
                 r.content.substring(0, 100) === contentSnippet
          )

          if (!exists) {
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
            newReviews++
          }
        }
        console.log(`    Stored ${newReviews} new reviews`)
      }

      // Store Q&A (only if ProductQuestion model exists)
      if (productData.questions && productData.questions.length > 0) {
        try {
          // @ts-ignore - ProductQuestion might not exist in Prisma client yet
          if (prisma.productQuestion) {
            // Delete existing Q&A for this product
            // @ts-ignore
            await prisma.productQuestion.deleteMany({
              where: { productId: product.id },
            })

            for (const question of productData.questions) {
              // @ts-ignore
              await prisma.productQuestion.create({
                data: {
                  productId: product.id,
                  question: question.question,
                  answer: question.answer,
                  answerAuthor: question.answerAuthor,
                  helpful: question.helpful,
                  source: 'amazon',
                },
              })
            }
            console.log(`    Stored ${productData.questions.length} Q&A items`)
          }
        } catch (qaError: any) {
          if (qaError.message?.includes('Unknown model') || qaError.message?.includes('ProductQuestion')) {
            console.log('    ⚠️ ProductQuestion table not found - please sync schema first')
          } else {
            throw qaError
          }
        }
      }

      scraped++
      updated++
      console.log(`  ✅ Successfully scraped and stored data\n`)

      // Rate limiting - increased delay to avoid Amazon blocking (3-5 seconds)
      const delay = 3000 + Math.floor(Math.random() * 2000) // 3-5 seconds with randomization
      await new Promise(resolve => setTimeout(resolve, delay))
    } catch (error) {
      console.error(`  ❌ Error:`, error)
      errors++
      console.log()
    }
  }

  console.log('='.repeat(60))
  console.log(`Summary:`)
  console.log(`  Scraped: ${scraped}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Errors: ${errors}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (require.main === module) {
  scrapeProductData()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { scrapeProductData }

