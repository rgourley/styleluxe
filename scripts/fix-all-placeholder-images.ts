/**
 * Comprehensive script to fix all placeholder images
 * Finds products with placeholder images (GIFs, small files) and scrapes real images from Amazon
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'
import { extractASINFromUrl } from '../lib/image-storage'

async function fixAllPlaceholderImages() {
  console.log('🔄 Finding all products that may have placeholder images...\n')

  try {
    // Find all published products with images
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        amazonUrl: true,
        currentScore: true,
      },
    })

    console.log(`Found ${products.length} published products with images\n`)

    // Filter for potential placeholders:
    // 1. GIF files (often placeholders)
    // 2. Very short URLs (might be placeholders)
    // 3. Files that might be 43-byte placeholders
    const potentialPlaceholders = products.filter(p => {
      if (!p.imageUrl) return false
      
      // Check for GIF extension
      if (p.imageUrl.includes('.gif')) return true
      
      // Check for known placeholder patterns
      if (p.imageUrl.includes('01jrA-8DXYL')) return true
      
      return false
    })

    console.log(`Found ${potentialPlaceholders.length} products with potential placeholder images\n`)

    if (potentialPlaceholders.length === 0) {
      console.log('✅ No products with placeholder images found!')
      return
    }

    let fixed = 0
    let failed = 0
    let skipped = 0

    for (const product of potentialPlaceholders) {
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

fixAllPlaceholderImages()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

