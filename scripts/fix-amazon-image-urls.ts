/**
 * Fix products with Amazon image URLs by migrating them to R2
 * This script finds products that still have Amazon URLs (not R2) and migrates them
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2, isR2Image, extractASINFromUrl } from '../lib/image-storage'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'

async function fixAmazonImageUrls() {
  console.log('🔄 Finding products with Amazon image URLs...\n')

  try {
    // Find products with Amazon image URLs (not R2)
    const products = await prisma.product.findMany({
      where: {
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

    // Filter for products with Amazon URLs (not R2)
    const amazonImageProducts = products.filter(product => {
      if (!product.imageUrl) return false
      
      // Skip if already has R2 image
      if (isR2Image(product.imageUrl)) return false
      
      // Check if it's an Amazon URL
      return product.imageUrl.includes('amazon.com') || 
             product.imageUrl.includes('media-amazon') ||
             product.imageUrl.includes('amazonaws')
    })

    console.log(`Found ${amazonImageProducts.length} products with Amazon image URLs\n`)

    if (amazonImageProducts.length === 0) {
      console.log('✅ No products with Amazon image URLs found!')
      return
    }

    // Show which products will be fixed
    console.log('Products to fix:')
    amazonImageProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}`)
      console.log(`     Image: ${product.imageUrl?.substring(0, 80)}...`)
    })
    console.log()

    let fixed = 0
    let failed = 0
    let skipped = 0

    for (const product of amazonImageProducts) {
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

        // Try to scrape Amazon product page for real image
        console.log(`   🔍 Scraping Amazon product page...`)
        let realImageUrl: string | null = null

        try {
          const scrapedProduct = await scrapeAmazonProductPage(product.amazonUrl)
          
          if (scrapedProduct?.imageUrl) {
            realImageUrl = scrapedProduct.imageUrl
            console.log(`   ✅ Found real image: ${realImageUrl.substring(0, 80)}...`)
          } else {
            // Fallback to using the existing imageUrl if it's a valid Amazon URL
            if (product.imageUrl && (product.imageUrl.includes('amazon.com') || product.imageUrl.includes('media-amazon'))) {
              realImageUrl = product.imageUrl
              console.log(`   ℹ️  Using existing Amazon image URL`)
            }
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error scraping: ${error.message}`)
          // Fallback to using the existing imageUrl if it's a valid Amazon URL
          if (product.imageUrl && (product.imageUrl.includes('amazon.com') || product.imageUrl.includes('media-amazon'))) {
            realImageUrl = product.imageUrl
            console.log(`   ℹ️  Using existing Amazon image URL as fallback`)
          }
        }

        if (!realImageUrl) {
          console.log(`   ❌ Could not get image URL`)
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

fixAmazonImageUrls()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

