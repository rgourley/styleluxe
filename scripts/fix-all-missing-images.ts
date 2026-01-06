/**
 * Fix all products with missing or placeholder images
 * Finds products with null images, Amazon placeholders, or invalid images
 * and scrapes real images from Amazon, storing them in R2
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2, extractASINFromUrl, isR2Image, isAmazonPlaceholder } from '../lib/image-storage'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'

async function fixAllMissingImages() {
  console.log('🔍 Finding products with missing or invalid images...\n')

  try {
    // Find products that need image fixes
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
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

    console.log(`Found ${products.length} published products with Amazon URLs\n`)
    console.log('Checking for missing or invalid images...\n')

    const productsToFix = []

    for (const product of products) {
      // Skip if product has a valid R2 image
      if (product.imageUrl && isR2Image(product.imageUrl)) {
        continue // Already has R2 image, skip
      }

      // Check if image is missing, null, or a placeholder
      if (!product.imageUrl) {
        productsToFix.push({ product, reason: 'missing image' })
      } else if (isAmazonPlaceholder(product.imageUrl)) {
        productsToFix.push({ product, reason: 'Amazon placeholder' })
      } else if (product.imageUrl.includes('amazon.com') || product.imageUrl.includes('media-amazon')) {
        // Amazon URL that's not a placeholder - should migrate to R2
        productsToFix.push({ product, reason: 'Amazon URL (needs R2 migration)' })
      }
    }

    console.log(`Found ${productsToFix.length} products that need image fixes:\n`)
    productsToFix.slice(0, 10).forEach(({ product, reason }) => {
      console.log(`  - ${product.name}: ${reason}`)
    })
    if (productsToFix.length > 10) {
      console.log(`  ... and ${productsToFix.length - 10} more`)
    }

    if (productsToFix.length === 0) {
      console.log('\n✅ No products with missing or invalid images found!')
      return
    }

    console.log(`\n🚀 Starting to fix ${productsToFix.length} products...\n`)

    let fixed = 0
    let failed = 0
    let skipped = 0

    for (let i = 0; i < productsToFix.length; i++) {
      const { product, reason } = productsToFix[i]

      try {
        if (!product.amazonUrl) {
          console.log(`\n[${i + 1}/${productsToFix.length}] ⏭️  Skipping ${product.name} - no Amazon URL`)
          skipped++
          continue
        }

        console.log(`\n[${i + 1}/${productsToFix.length}] 📦 Fixing: ${product.name}`)
        console.log(`   Reason: ${reason}`)
        console.log(`   Current image: ${product.imageUrl || 'none'}`)
        console.log(`   Amazon URL: ${product.amazonUrl}`)

        const asin = extractASINFromUrl(product.amazonUrl)
        if (!asin) {
          console.log(`   ⚠️  Could not extract ASIN`)
          skipped++
          continue
        }

        console.log(`   ASIN: ${asin}`)

        // Scrape Amazon product page
        console.log(`   🔍 Scraping Amazon product page...`)
        let realImageUrl: string | null = null

        try {
          const scrapedProduct = await scrapeAmazonProductPage(product.amazonUrl)
          
          if (scrapedProduct?.imageUrl) {
            // Check if scraped image is a placeholder
            if (isAmazonPlaceholder(scrapedProduct.imageUrl)) {
              console.log(`   ⚠️  Scraped image is a placeholder, skipping`)
              skipped++
              continue
            }
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

        // Store in R2
        console.log(`   🚀 Storing in R2...`)
        const r2ImageUrl = await storeAmazonImageInR2(realImageUrl, product.id, asin)

        if (r2ImageUrl) {
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: r2ImageUrl },
          })
          console.log(`   ✅ Fixed! New image: ${r2ImageUrl}`)
          fixed++
        } else {
          console.log(`   ❌ Failed to store in R2`)
          failed++
        }

        // Rate limiting: wait 3 seconds between requests
        if (i < productsToFix.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
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

fixAllMissingImages()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

