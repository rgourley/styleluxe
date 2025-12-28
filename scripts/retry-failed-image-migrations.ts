/**
 * Retry migration for products that still have Amazon image URLs
 * This script will attempt to migrate the remaining 4 products
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'
import { getAmazonImageUrl } from '../lib/amazon-image'

async function retryFailedMigrations() {
  console.log('🔄 Retrying migration for products with Amazon image URLs...\n')

  try {
    // Find products that still have Amazon URLs
    const products = await prisma.product.findMany({
      where: {
        imageUrl: {
          not: null,
        },
        OR: [
          { imageUrl: { contains: 'amazon' } },
          { imageUrl: { contains: 'amazonaws' } },
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        amazonUrl: true,
      },
    })

    console.log(`Found ${products.length} products still with Amazon image URLs\n`)

    if (products.length === 0) {
      console.log('✅ No products to migrate!')
      return
    }

    let migrated = 0
    let failed = 0

    for (const product of products) {
      try {
        console.log(`\n📥 Retrying migration for: ${product.name}`)
        console.log(`   Current imageUrl: ${product.imageUrl?.substring(0, 100)}`)

        // Extract ASIN from Amazon URL if available
        let asin: string | undefined
        if (product.amazonUrl) {
          const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})|ASIN[=:]([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i)
          asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : undefined
          if (asin) {
            console.log(`   ASIN: ${asin}`)
          }
        }

        // Check if the stored imageUrl is valid (not a tracking URL)
        let amazonImageUrl = product.imageUrl || product.amazonUrl
        const isInvalidUrl = amazonImageUrl && (
          amazonImageUrl.startsWith('//') || 
          amazonImageUrl.includes('fls-na.amazon.com') ||
          amazonImageUrl.includes('uedata')
        )
        
        // If URL is invalid but we have ASIN, generate proper image URL
        if (isInvalidUrl && asin) {
          console.log(`   ⚠️  Invalid image URL detected, generating from ASIN...`)
          const generatedUrl = getAmazonImageUrl(`https://www.amazon.com/dp/${asin}`)
          if (generatedUrl) {
            amazonImageUrl = generatedUrl
            console.log(`   ✓ Generated image URL: ${generatedUrl.substring(0, 80)}...`)
          }
        }
        
        if (!amazonImageUrl) {
          console.log(`⚠️  Skipping - no valid image URL`)
          failed++
          continue
        }

        console.log(`   Attempting to download and upload to R2...`)
        const r2ImageUrl = await storeAmazonImageInR2(amazonImageUrl, product.id, asin)

        if (r2ImageUrl) {
          // Update product with R2 URL
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: r2ImageUrl },
          })
          console.log(`✅ Successfully migrated!`)
          console.log(`   New URL: ${r2ImageUrl}`)
          migrated++
        } else {
          console.log(`❌ Failed - storeAmazonImageInR2 returned null`)
          console.log(`   This usually means Amazon blocked the download (403) or the URL is invalid`)
          failed++
        }
      } catch (error: any) {
        console.error(`❌ Error:`, error.message || error)
        if (error.stack) {
          console.error(`   Stack:`, error.stack.split('\n').slice(0, 3).join('\n'))
        }
        failed++
      }

      // Add delay between products
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n📊 Retry Summary:')
    console.log(`✅ Migrated: ${migrated}`)
    console.log(`❌ Failed: ${failed}`)
    
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} products still have Amazon URLs.`)
      console.log(`   These may need manual image upload through the admin panel.`)
    }
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

retryFailedMigrations()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

