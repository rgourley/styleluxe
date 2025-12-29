/**
 * Fix placeholder images for specific products by re-scraping from Amazon
 * This script finds products with placeholder images and replaces them with real images
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'
import { extractASINFromUrl } from '../lib/image-storage'

async function fixPlaceholderImages() {
  console.log('🔄 Finding products with placeholder images...\n')

  try {
    // Find products with placeholder images
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        imageUrl: {
          not: null,
        },
        amazonUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        amazonUrl: true,
      },
    })

    // Filter for placeholder images - check both URL patterns and file sizes
    const placeholderProducts = []
    
    console.log('Checking all products for placeholder images...\n')
    
    for (const product of products) {
      if (!product.imageUrl) continue
      
      // Check URL patterns
      const placeholderPatterns = [
        /01jrA-8DXYL/i,
        /1px/i,
        /\.gif$/i,
        /fls-na\.amazon\.com/i,
        /uedata/i,
        /placeholder/i,
        /spacer/i,
      ]
      
      const matchesPattern = placeholderPatterns.some(pattern => pattern.test(product.imageUrl || ''))
      
      // Also check file size if it's an R2 URL
      let isSmallFile = false
      if (product.imageUrl.includes('r2.dev') || product.imageUrl.includes('r2.cloudflarestorage.com')) {
        try {
          const response = await fetch(product.imageUrl, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const size = parseInt(contentLength)
            isSmallFile = size < 2000 // Less than 2KB is likely a placeholder
            if (isSmallFile) {
              console.log(`   Found small file: ${product.name} (${size} bytes)`)
            }
          }
        } catch (error) {
          // If we can't check, assume it might be a placeholder if pattern matches
        }
      }
      
      if (matchesPattern || isSmallFile) {
        placeholderProducts.push(product)
      }
    }

    console.log(`Found ${placeholderProducts.length} products with placeholder images\n`)

    if (placeholderProducts.length === 0) {
      console.log('✅ No products with placeholder images found!')
      return
    }

    let fixed = 0
    let failed = 0
    let skipped = 0

    for (const product of placeholderProducts) {
      try {
        if (!product.amazonUrl) {
          console.log(`⏭️  Skipping ${product.name} - no Amazon URL`)
          skipped++
          continue
        }

        console.log(`\n📥 Fixing ${product.name}...`)
        console.log(`   Current image: ${product.imageUrl?.substring(0, 80)}...`)
        console.log(`   Amazon URL: ${product.amazonUrl}`)

        // Extract ASIN
        const asin = extractASINFromUrl(product.amazonUrl)
        if (!asin) {
          console.log(`   ⚠️  Could not extract ASIN`)
          skipped++
          continue
        }

        console.log(`   ASIN: ${asin}`)

        // Scrape Amazon product page for real image
        console.log(`   🔍 Scraping Amazon product page...`)
        let realImageUrl: string | null = null

        try {
          const scrapedProduct = await scrapeAmazonProductPage(product.amazonUrl)
          
          if (scrapedProduct?.imageUrl) {
            realImageUrl = scrapedProduct.imageUrl
            console.log(`   ✅ Found real image: ${realImageUrl.substring(0, 80)}...`)
          } else {
            console.log(`   ⚠️  Scraper didn't return image URL`)
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error scraping: ${error.message}`)
        }

        if (!realImageUrl) {
          console.log(`   ❌ Could not get real image URL`)
          failed++
          continue
        }

        // Migrate to R2
        console.log(`   🚀 Migrating to R2...`)
        const r2ImageUrl = await storeAmazonImageInR2(realImageUrl, product.id, asin)

        if (r2ImageUrl) {
          // Update product with R2 URL
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: r2ImageUrl },
          })
          console.log(`   ✅ Fixed! New image: ${r2ImageUrl}`)
          fixed++
        } else {
          console.log(`   ❌ Failed to migrate to R2`)
          failed++
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (error: any) {
        console.error(`   ❌ Error fixing ${product.name}:`, error.message || error)
        failed++
      }
    }

    console.log('\n📊 Fix Summary:')
    console.log(`✅ Fixed: ${fixed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`\n✅ Done!`)
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

fixPlaceholderImages()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

