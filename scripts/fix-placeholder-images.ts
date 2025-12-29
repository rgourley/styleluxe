/**
 * Fix products with placeholder images by fetching real images from Amazon
 * This script finds products with placeholder GIFs and attempts to get real product images
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'
import { getAmazonImageUrl, fetchAmazonImageFromUrl } from '../lib/amazon-image'
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
        OR: [
          { imageUrl: { contains: '01jrA-8DXYL' } }, // Common Amazon placeholder
          { imageUrl: { contains: '.gif' } }, // Any GIF might be a placeholder
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        amazonUrl: true,
      },
    })

    console.log(`Found ${products.length} products with placeholder images\n`)

    if (products.length === 0) {
      console.log('✅ No products with placeholder images found!')
      return
    }

    let fixed = 0
    let failed = 0
    let skipped = 0

    for (const product of products) {
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

        // Try to scrape the Amazon product page to get the real image
        console.log(`   🔍 Scraping Amazon product page for real image...`)
        let realImageUrl: string | null = null

        try {
          const { scrapeAmazonProductPage } = await import('../lib/amazon-product-scraper')
          const scrapedProduct = await scrapeAmazonProductPage(product.amazonUrl)
          
          if (scrapedProduct?.imageUrl) {
            realImageUrl = scrapedProduct.imageUrl
            console.log(`   ✅ Found real image from scraper: ${realImageUrl.substring(0, 80)}...`)
          } else {
            console.log(`   ⚠️  Scraper didn't return image, trying fetchAmazonImageFromUrl...`)
            realImageUrl = await fetchAmazonImageFromUrl(product.amazonUrl)
            if (realImageUrl) {
              console.log(`   ✅ Found real image: ${realImageUrl.substring(0, 80)}...`)
            }
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error scraping/fetching: ${error.message}`)
        }

        // Final fallback: try generated URL from ASIN (but this often doesn't work)
        if (!realImageUrl) {
          console.log(`   ⚠️  Trying generated URL from ASIN (may not work)...`)
          realImageUrl = getAmazonImageUrl(product.amazonUrl)
          if (realImageUrl) {
            console.log(`   ⚠️  Using generated URL (may be placeholder): ${realImageUrl.substring(0, 80)}...`)
          }
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
        await new Promise(resolve => setTimeout(resolve, 2000))
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

