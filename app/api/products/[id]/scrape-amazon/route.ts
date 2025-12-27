import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Scrape Amazon data for a single product
 * Updates reviews, metadata, price, and image
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load dependencies to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    const { scrapeAmazonProductPage } = await import('@/lib/amazon-product-scraper')
    
    const { id } = await params

    // Fetch product
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        reviews: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product.amazonUrl) {
      return NextResponse.json(
        { success: false, message: 'Product does not have an Amazon URL' },
        { status: 400 }
      )
    }

    console.log(`Scraping Amazon data for: ${product.name}`)
    console.log(`  URL: ${product.amazonUrl}`)

    // Scrape product page
    const productData = await scrapeAmazonProductPage(product.amazonUrl)

    if (!productData) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to scrape product page. Amazon may be blocking the request. This can happen if: 1) Too many requests were made recently, 2) Amazon detected automated scraping, 3) The product URL is invalid or the product is no longer available. Try again later or check the product URL manually.' 
        },
        { status: 500 }
      )
    }

    console.log(`  ✓ Scraped product data`)
    console.log(`    Rating: ${productData.starRating || 'N/A'} stars`)
    console.log(`    Reviews: ${productData.totalReviewCount || 'N/A'}`)
    console.log(`    Price: ${productData.price || 'N/A'}`)

    // Update product with latest price and image if available
    if (productData.price || productData.imageUrl) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          price: productData.price || product.price,
          imageUrl: productData.imageUrl || product.imageUrl,
        },
      })
    }

    // Store or update metadata
    try {
      const metadataData = {
        starRating: productData.starRating,
        totalReviewCount: productData.totalReviewCount,
        availability: productData.availability,
        description: productData.description,
        keyFeatures: productData.keyFeatures || [],
        // Note: positiveThemes, negativeThemes, specificDetails, memorableQuotes
        // are not scraped from Amazon - they are populated later from review analysis
      }

      // @ts-ignore - ProductMetadata might not exist in Prisma client yet
      if (prisma.productMetadata) {
        // @ts-ignore
        await prisma.productMetadata.upsert({
          where: { productId: product.id },
          update: metadataData,
          create: {
            productId: product.id,
            ...metadataData,
          },
        })
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
      // Continue even if metadata fails
    }

    // Store reviews (delete old ones and add new)
    try {
      // Delete existing reviews
      await prisma.review.deleteMany({
        where: { productId: product.id },
      })

      // Add new reviews
      if (productData.reviews && productData.reviews.length > 0) {
        await prisma.review.createMany({
          data: productData.reviews.map((review) => ({
            productId: product.id,
            rating: review.rating,
            title: review.title,
            content: review.content,
            author: review.author,
            date: review.date ? new Date(review.date) : null,
            helpful: review.helpful,
            verified: review.verified || false,
            source: 'AMAZON',
          })),
        })
      }
    } catch (error) {
      console.error('Error saving reviews:', error)
      // Continue even if reviews fail
    }

    // Store Q&A
    try {
      // Delete existing questions
      // @ts-ignore
      if (prisma.productQuestion) {
        // @ts-ignore
        await prisma.productQuestion.deleteMany({
          where: { productId: product.id },
        })

        // Add new questions
        if (productData.questions && productData.questions.length > 0) {
          // @ts-ignore
          await prisma.productQuestion.createMany({
            data: productData.questions.map((qa) => ({
              productId: product.id,
              question: qa.question,
              answer: qa.answer,
              helpful: qa.helpful || 0,
            })),
          })
        }
      }
    } catch (error) {
      console.error('Error saving Q&A:', error)
      // Continue even if Q&A fails
    }

    return NextResponse.json({
      success: true,
      message: `Scraped Amazon data: ${productData.totalReviewCount || 0} reviews, ${productData.starRating || 'N/A'} stars`,
      data: {
        reviewCount: productData.totalReviewCount,
        starRating: productData.starRating,
        price: productData.price,
        hasImage: !!productData.imageUrl,
      },
    })
  } catch (error) {
    console.error('Error scraping Amazon data:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

