import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Approve and add a search result to the database
 */
export async function POST(request: Request) {
  try {
    // Lazy load dependencies to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    const { searchRedditForQuotes } = await import('@/lib/search-reddit-quotes')
    const { scrapeAmazonProductPage } = await import('@/lib/amazon-product-scraper')
    
    const { 
      amazonData, 
      redditPosts, 
      searchTerm,
      isOnMoversShakers = true // Default to true for backwards compatibility
    } = await request.json()

    if (!amazonData && (!redditPosts || redditPosts.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'At least Amazon data or Reddit posts required' },
        { status: 400 }
      )
    }

    // Check if product already exists
    let product = null
    if (amazonData?.amazonUrl) {
      product = await prisma.product.findFirst({
        where: {
          amazonUrl: amazonData.amazonUrl,
        },
        include: {
          trendSignals: true,
        },
      })
    }

    if (product) {
      // Update existing product
      console.log(`Updating existing product: ${product.name}`)

      // If no Reddit posts provided, search Reddit using the Amazon product name/brand
      let redditPostsToUse = redditPosts || []
      if (redditPostsToUse.length === 0 && amazonData) {
        console.log('No Reddit posts provided, searching Reddit using Amazon product data...')
        try {
          const redditQuotes = await searchRedditForQuotes(
            amazonData.name,
            amazonData.brand || undefined
          )
          // Convert quotes to post format for storage
          redditPostsToUse = redditQuotes.slice(0, 10).map(quote => ({
            id: `quote-${Date.now()}-${Math.random()}`,
            title: quote.text.substring(0, 200),
            score: quote.upvotes,
            num_comments: 0,
            subreddit: quote.subreddit,
            url: quote.url,
            created_utc: Date.now() / 1000,
            author: 'unknown',
          }))
          console.log(`Found ${redditPostsToUse.length} Reddit mentions`)
        } catch (error) {
          console.error('Error searching Reddit:', error)
          // Continue without Reddit data
        }
      }

      // Add Reddit signals if provided
      if (redditPostsToUse && redditPostsToUse.length > 0) {
        for (const redditPost of redditPostsToUse) {
          // Check if signal already exists by checking all Reddit signals
          const allRedditSignals = await prisma.trendSignal.findMany({
            where: {
              productId: product.id,
              source: 'reddit_skincare',
            },
          })
          
          const existingSignal = allRedditSignals.find(s => {
            const metadata = s.metadata as any
            return metadata?.postId === redditPost.id
          })

          if (!existingSignal) {
            await prisma.trendSignal.create({
              data: {
                productId: product.id,
                source: 'reddit_skincare',
                signalType: 'reddit_mentions',
                value: redditPost.score,
                metadata: {
                  postId: redditPost.id,
                  subreddit: redditPost.subreddit,
                  postTitle: redditPost.title,
                  score: redditPost.score,
                  comments: redditPost.num_comments,
                  url: redditPost.url,
                  permalink: redditPost.url,
                  created: new Date(redditPost.created_utc * 1000).toISOString(),
                  searchTerm: searchTerm,
                  manuallyAdded: true,
                },
              },
            })
          }
        }
      }

      // Recalculate score
      const allSignals = await prisma.trendSignal.findMany({
        where: { productId: product.id },
      })

      // If this is an Amazon product being manually added, check if it's from M&S
      let amazonScore = 0
      if (amazonData) {
        // Use the admin's M&S toggle to determine score
        amazonScore = isOnMoversShakers ? 100 : 50
      } else {
        // Check existing signals
        for (const signal of allSignals) {
          if (signal.source === 'amazon_movers') {
            const metadata = signal.metadata as any
            const salesJump = signal.value || metadata?.salesJumpPercent || 0
            if (salesJump > 0) {
              amazonScore = Math.min(70, Math.floor(salesJump / 20))
            } else {
              amazonScore = 10
            }
            break
          }
        }
      }

      const redditSignalsForScore = allSignals
        .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 50)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 2)
      const redditScore = Math.min(30, redditSignalsForScore.length * 15)
      const totalScore = amazonScore + redditScore

      // Validate and clean product name
      let productName = amazonData?.name || product.name
      // If name looks like a rating (just a number), keep existing name
      if (productName && productName.match(/^\d+\.?\d*$/)) {
        console.warn(`Product name looks like a rating: "${productName}". Keeping existing name: "${product.name}"`)
        productName = product.name
      }
      // If name is too short or suspicious, keep existing name
      if (productName && productName.length < 5 && productName.match(/^\d/)) {
        console.warn(`Product name seems invalid: "${productName}". Keeping existing name: "${product.name}"`)
        productName = product.name
      }

      // Check if product already has an R2 image (don't overwrite it)
      const hasR2Image = product.imageUrl && (
        product.imageUrl.includes('r2.dev') || 
        product.imageUrl.includes('r2.cloudflarestorage.com') ||
        product.imageUrl.includes('pub-') // R2 public URLs
      )

      // Migrate image to R2 if it's an Amazon image, but only if product doesn't already have R2 image
      let imageUrl = product.imageUrl // Keep existing image by default
      if (!hasR2Image && amazonData?.imageUrl && (amazonData.imageUrl.includes('amazon.com') || amazonData.imageUrl.includes('media-amazon'))) {
        try {
          const { storeAmazonImageInR2, extractASINFromUrl } = await import('@/lib/image-storage')
          const asin = extractASINFromUrl(amazonData?.amazonUrl || product.amazonUrl || '')
          const r2ImageUrl = await storeAmazonImageInR2(amazonData.imageUrl, product.id, asin || undefined)
          if (r2ImageUrl) {
            imageUrl = r2ImageUrl
            console.log(`✅ Migrated image to R2 for product: ${product.name}`)
          } else {
            // If R2 migration failed, keep existing image (don't use Amazon placeholder)
            console.log(`⚠️ Failed to migrate image to R2, keeping existing image`)
          }
        } catch (error) {
          console.error('Error migrating image to R2:', error)
          // Keep existing image if migration fails (don't overwrite with Amazon placeholder)
        }
      } else if (hasR2Image) {
        console.log(`ℹ️  Product already has R2 image, not overwriting: ${product.imageUrl?.substring(0, 50)}...`)
      }

      // Update product
      await prisma.product.update({
        where: { id: product.id },
        data: {
          name: productName,
          brand: amazonData?.brand || product.brand,
          price: amazonData?.price || product.price,
          imageUrl,
          trendScore: Math.max(product.trendScore, totalScore),
          status: 'FLAGGED', // Set to FLAGGED for review generation
          onMoversShakers: amazonData ? isOnMoversShakers : product.onMoversShakers, // Use admin's M&S toggle
          lastSeenOnMoversShakers: amazonData && isOnMoversShakers ? new Date() : product.lastSeenOnMoversShakers, // Update timestamp only if on M&S
        },
      })

      // Update age decay fields if Amazon data is provided
      if (amazonData) {
        const { setFirstDetected } = await import('@/lib/trending-products')
        // Use amazonScore (100 or 50) as the base score, not totalScore
        await setFirstDetected(product.id, amazonScore)
      }

      // Scrape and save Amazon reviews if we have an Amazon URL and don't already have reviews
      if (amazonData?.amazonUrl) {
        try {
          // Check if we already have reviews
          const existingReviews = await prisma.review.count({
            where: {
              productId: product.id,
              source: 'AMAZON',
            },
          })

          if (existingReviews < 5) {
            console.log(`Scraping Amazon reviews for: ${amazonData.amazonUrl}`)
            const scrapedProduct = await scrapeAmazonProductPage(amazonData.amazonUrl)
            
            if (scrapedProduct?.reviews && scrapedProduct.reviews.length > 0) {
              // Save reviews to database
              for (const review of scrapedProduct.reviews.slice(0, 20)) { // Save up to 20 reviews
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
              }
              console.log(`✅ Saved ${Math.min(scrapedProduct.reviews.length, 20)} Amazon reviews`)
            }
          }
        } catch (error) {
          console.error('Error scraping Amazon reviews:', error)
          // Don't fail the whole request if review scraping fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Product updated successfully',
        productId: product.id,
        updated: true,
      })
    } else {
      // Create new product
      console.log(`Creating new product from search: ${amazonData?.name || searchTerm}`)

      // Calculate initial score
      // Use the admin's M&S toggle to determine score
      let amazonScore = 0
      if (amazonData) {
        amazonScore = isOnMoversShakers ? 100 : 50
      }

      // Search Reddit if not provided and we have Amazon data
      let redditPostsToUse = redditPosts || []
      if (redditPostsToUse.length === 0 && amazonData) {
        console.log('No Reddit posts provided, searching Reddit using Amazon product data...')
        try {
          const redditQuotes = await searchRedditForQuotes(
            amazonData.name,
            amazonData.brand || undefined
          )
          // Convert quotes to post format for storage
          redditPostsToUse = redditQuotes.slice(0, 10).map(quote => ({
            id: `quote-${Date.now()}-${Math.random()}`,
            title: quote.text.substring(0, 200),
            score: quote.upvotes,
            num_comments: 0,
            subreddit: quote.subreddit,
            url: quote.url,
            created_utc: Date.now() / 1000,
            author: 'unknown',
          }))
          console.log(`Found ${redditPostsToUse.length} Reddit mentions`)
        } catch (error) {
          console.error('Error searching Reddit:', error)
          // Continue without Reddit data
        }
      }

      let redditScore = 0
      if (redditPostsToUse && redditPostsToUse.length > 0) {
        const topReddit = redditPostsToUse
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 2)
        redditScore = Math.min(30, topReddit.length * 15)
      }

      const totalScore = amazonScore + redditScore

      // Validate and clean product name
      let productName = amazonData?.name || searchTerm
      // If name looks like a rating (just a number), use search term instead
      if (productName && productName.match(/^\d+\.?\d*$/)) {
        console.warn(`Product name looks like a rating: "${productName}". Using search term instead.`)
        productName = searchTerm
      }
      // If name is too short or suspicious, prefer search term
      if (productName && productName.length < 5 && productName.match(/^\d/)) {
        console.warn(`Product name seems invalid: "${productName}". Using search term instead.`)
        productName = searchTerm
      }

      // Migrate image to R2 if it's an Amazon image
      let imageUrl = amazonData?.imageUrl
      // Create product first to get the ID, then migrate image
      const newProduct = await prisma.product.create({
        data: {
          name: productName,
          brand: amazonData?.brand || (productName !== searchTerm ? productName.split(' ')[0] : searchTerm.split(' ')[0]),
          price: amazonData?.price,
          imageUrl: imageUrl, // Will update with R2 URL if migration succeeds
          amazonUrl: amazonData?.amazonUrl,
          trendScore: totalScore,
          status: 'FLAGGED',
          onMoversShakers: amazonData ? isOnMoversShakers : false, // Use admin's M&S toggle
          lastSeenOnMoversShakers: amazonData && isOnMoversShakers ? new Date() : null, // Set timestamp only if on M&S
        },
      })

      // Migrate image to R2 after product creation (we need the product ID)
      if (imageUrl && (imageUrl.includes('amazon.com') || imageUrl.includes('media-amazon'))) {
        try {
          const { storeAmazonImageInR2, extractASINFromUrl } = await import('@/lib/image-storage')
          const asin = extractASINFromUrl(amazonData?.amazonUrl || '')
          const r2ImageUrl = await storeAmazonImageInR2(imageUrl, newProduct.id, asin || undefined)
          if (r2ImageUrl) {
            // Update product with R2 image URL
            await prisma.product.update({
              where: { id: newProduct.id },
              data: { imageUrl: r2ImageUrl },
            })
            imageUrl = r2ImageUrl
            console.log(`✅ Migrated image to R2 for new product: ${productName}`)
          }
        } catch (error) {
          console.error('Error migrating image to R2:', error)
          // Continue with original image URL if migration fails
        }
      }

      // Initialize age decay fields (set firstDetected, baseScore, currentScore, etc.)
      const { setFirstDetected } = await import('@/lib/trending-products')
      // Use amazonScore (100 or 50) as the base score, not totalScore
      await setFirstDetected(newProduct.id, amazonScore)

      // Add Amazon signal if available
      if (amazonData) {
        await prisma.trendSignal.create({
          data: {
            productId: newProduct.id,
            source: 'amazon_movers',
            signalType: 'manual_search',
            value: 0,
            metadata: {
              searchTerm: searchTerm,
              manuallyAdded: true,
              detectedAt: new Date().toISOString(),
            },
          },
        })
      }

      // Add Reddit signals
      if (redditPostsToUse && redditPostsToUse.length > 0) {
        for (const redditPost of redditPostsToUse) {
          await prisma.trendSignal.create({
            data: {
              productId: newProduct.id,
              source: 'reddit_skincare',
              signalType: 'reddit_mentions',
              value: redditPost.score,
              metadata: {
                postId: redditPost.id,
                subreddit: redditPost.subreddit,
                postTitle: redditPost.title,
                score: redditPost.score,
                comments: redditPost.num_comments,
                url: redditPost.url,
                permalink: redditPost.url,
                created: new Date(redditPost.created_utc * 1000).toISOString(),
                searchTerm: searchTerm,
                manuallyAdded: true,
              },
            },
          })
        }
      }

      // Scrape and save Amazon reviews if we have an Amazon URL
      if (amazonData?.amazonUrl) {
        try {
          console.log(`Scraping Amazon reviews for: ${amazonData.amazonUrl}`)
          const scrapedProduct = await scrapeAmazonProductPage(amazonData.amazonUrl)
          
          if (scrapedProduct?.reviews && scrapedProduct.reviews.length > 0) {
            // Save reviews to database
            for (const review of scrapedProduct.reviews.slice(0, 20)) { // Save up to 20 reviews
              await prisma.review.create({
                data: {
                  productId: newProduct.id,
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
            }
            console.log(`✅ Saved ${Math.min(scrapedProduct.reviews.length, 20)} Amazon reviews`)
          }
        } catch (error) {
          console.error('Error scraping Amazon reviews:', error)
          // Don't fail the whole request if review scraping fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Product created successfully',
        productId: newProduct.id,
        updated: false,
      })
    }
  } catch (error) {
    console.error('Approve search result error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

