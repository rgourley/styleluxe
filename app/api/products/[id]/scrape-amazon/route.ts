import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

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

    // Check if product already has an R2 image (don't overwrite it)
    const hasR2Image = product.imageUrl && (
      product.imageUrl.includes('r2.dev') || 
      product.imageUrl.includes('r2.cloudflarestorage.com') ||
      product.imageUrl.includes('pub-') // R2 public URLs
    )

    // Store image in R2 if we have one and it's from Amazon
    // BUT only if product doesn't already have an R2 image
    let finalImageUrl = product.imageUrl // Keep existing image by default
    if (!hasR2Image && productData.imageUrl && (productData.imageUrl.includes('amazon.com') || productData.imageUrl.includes('media-amazon'))) {
      try {
        const { storeAmazonImageInR2, extractASINFromUrl } = await import('@/lib/image-storage')
        const asin = productData.asin || extractASINFromUrl(product.amazonUrl || '')
        const r2ImageUrl = await storeAmazonImageInR2(productData.imageUrl, product.id, asin || undefined)
        if (r2ImageUrl) {
          finalImageUrl = r2ImageUrl
          console.log(`  ✓ Stored image in R2: ${r2ImageUrl}`)
        } else {
          console.log(`  ⚠️ Failed to store image in R2, keeping existing image`)
          // Don't update imageUrl if R2 upload failed - keep existing
        }
      } catch (error) {
        console.error('  ⚠️ Error storing image in R2:', error)
        // Keep existing image if R2 upload fails
      }
    } else if (hasR2Image) {
      console.log(`  ℹ️  Product already has R2 image, not overwriting: ${product.imageUrl?.substring(0, 50)}...`)
    }

    // Update product with latest price (only update image if we got a new R2 image)
    const updateData: any = {}
    if (productData.price) {
      updateData.price = productData.price
    }
    // Only update imageUrl if we have a new R2 image (not if we're keeping the existing one)
    if (finalImageUrl && finalImageUrl !== product.imageUrl && (finalImageUrl.includes('r2.dev') || finalImageUrl.includes('r2.cloudflarestorage.com'))) {
      updateData.imageUrl = finalImageUrl
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      })
      
      // Invalidate cache when product is updated
      revalidatePath('/', 'layout')
      revalidatePath('/trending', 'page')
      
      // Invalidate product page if it has content
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: { content: { select: { slug: true } } }
      })
      if (updatedProduct?.content?.slug) {
        revalidatePath(`/products/${updatedProduct.content.slug}`)
      }
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

