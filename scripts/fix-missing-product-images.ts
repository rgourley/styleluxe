/**
 * Fix products with missing/invalid images by scraping Amazon product pages
 * This script will scrape the actual product image from Amazon product pages
 * and upload them to R2
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'
import * as cheerio from 'cheerio'

// Invalidate cache after updating products
async function invalidateCache() {
  try {
    // Call the revalidate API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['products', 'trending', 'rising', 'recent'],
        paths: ['/', '/trending'],
      }),
    })
    
    if (response.ok) {
      console.log('  ✅ Cache invalidated')
    } else {
      console.log('  ⚠️  Cache invalidation failed (non-critical)')
    }
  } catch (error) {
    // Non-critical - cache will revalidate automatically after revalidate time
    console.log('  ⚠️  Cache invalidation skipped (non-critical)')
  }
}

async function scrapeProductImage(amazonUrl: string): Promise<string | null> {
  try {
    console.log(`  📥 Scraping product page: ${amazonUrl.substring(0, 80)}...`)
    
    const response = await fetch(amazonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.amazon.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try multiple selectors for the main product image
    const imageSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '#main-image',
      '.a-dynamic-image',
      '[data-a-dynamic-image]',
      '#imageBlock_feature_div img',
      '#altImages img',
    ]

    let imageUrl: string | null = null

    for (const selector of imageSelectors) {
      const element = $(selector).first()
      
      if (selector === '[data-a-dynamic-image]') {
        // Handle data-a-dynamic-image attribute (JSON object with multiple sizes)
        const dataAttr = element.attr('data-a-dynamic-image')
        if (dataAttr) {
          try {
            const imageData = JSON.parse(dataAttr)
            if (typeof imageData === 'object' && imageData !== null) {
              // Get the largest image
              const sizes = Object.keys(imageData)
                .map(s => parseInt(s))
                .sort((a, b) => b - a)
              if (sizes.length > 0) {
                imageUrl = imageData[sizes[0].toString()]
                break
              }
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      } else {
        // Regular src attribute
        const src = element.attr('src') || element.attr('data-src')
        if (src && src.startsWith('http')) {
          imageUrl = src
          break
        }
      }
    }

    if (imageUrl) {
      // Clean up the URL (remove query parameters that might cause issues)
      imageUrl = imageUrl.split('?')[0]
      console.log(`  ✓ Found image: ${imageUrl.substring(0, 80)}...`)
      return imageUrl
    }

    console.log(`  ⚠️  No image found on product page`)
    return null
  } catch (error: any) {
    console.error(`  ❌ Error scraping: ${error.message}`)
    return null
  }
}

async function fixMissingImages() {
  console.log('🔧 Fixing products with missing/invalid images...\n')

  const productNames = [
    'Kojic Acid Dark Spot Remover Soap',
    'Vitamin Illuminating Serum',
    'Dr Melaxin Peeling Ampoule Exfoliating Blackheads'
  ]

  let fixed = 0
  let failed = 0

  for (const productName of productNames) {
    try {
      const product = await prisma.product.findFirst({
        where: { name: { contains: productName, mode: 'insensitive' } },
        select: { id: true, name: true, imageUrl: true, amazonUrl: true },
      })

      if (!product) {
        console.log(`❌ ${productName}: Product not found`)
        failed++
        continue
      }

      console.log(`\n📦 ${product.name}`)
      
      // Check if current image is too small (likely invalid)
      if (product.imageUrl && product.imageUrl.includes('r2.dev')) {
        try {
          const response = await fetch(product.imageUrl, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          if (contentLength && parseInt(contentLength) < 1000) {
            console.log(`  ⚠️  Current image is too small (${contentLength} bytes), will replace`)
          } else {
            console.log(`  ✓ Current image seems valid (${contentLength} bytes), skipping`)
            continue
          }
        } catch (e) {
          console.log(`  ⚠️  Could not check current image, will try to replace`)
        }
      }

      if (!product.amazonUrl) {
        console.log(`  ❌ No Amazon URL, cannot scrape`)
        failed++
        continue
      }

      // Extract ASIN
      const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
      const asin = asinMatch ? asinMatch[1] : undefined

      // Scrape the product page for the actual image
      const scrapedImageUrl = await scrapeProductImage(product.amazonUrl)

      if (!scrapedImageUrl) {
        console.log(`  ❌ Could not scrape image from product page`)
        failed++
        continue
      }

      // Upload to R2
      console.log(`  📤 Uploading to R2...`)
      const r2ImageUrl = await storeAmazonImageInR2(scrapedImageUrl, product.id, asin)

      if (r2ImageUrl) {
        // Update product
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: r2ImageUrl },
        })
        console.log(`  ✅ Fixed! New URL: ${r2ImageUrl}`)
        fixed++
        
        // Invalidate cache after updating
        await invalidateCache()
      } else {
        console.log(`  ❌ Failed to upload to R2`)
        failed++
      }

      // Delay between products
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (error: any) {
      console.error(`❌ Error fixing ${productName}:`, error.message)
      failed++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`✅ Fixed: ${fixed}`)
  console.log(`❌ Failed: ${failed}`)
}

fixMissingImages()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

