/**
 * Migrate existing Amazon image URLs to R2
 * 
 * This script finds all products with Amazon image URLs and migrates them to R2.
 * It downloads the images from Amazon and uploads them to R2, then updates the product's imageUrl.
 */

// Load environment variables - must be done before any other imports
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2 } from '../lib/image-storage'

async function migrateAmazonImagesToR2() {
  console.log('🔄 Starting migration of Amazon images to R2...\n')

  try {
    // Find all products with Amazon image URLs
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

    console.log(`Found ${products.length} products with Amazon image URLs\n`)

    if (products.length === 0) {
      console.log('✅ No products to migrate!')
      return
    }

    let migrated = 0
    let failed = 0
    let skipped = 0

    for (const product of products) {
      try {
        // Check if imageUrl is already an R2 URL
        const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
        if (r2PublicUrl && product.imageUrl?.includes(r2PublicUrl)) {
          console.log(`⏭️  Skipping ${product.name} - already using R2`)
          skipped++
          continue
        }

        // Extract ASIN from Amazon URL if available
        let asin: string | undefined
        if (product.amazonUrl) {
          const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})|ASIN[=:]([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i)
          asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : undefined
        }

        // Migrate image to R2
        const amazonImageUrl = product.imageUrl || product.amazonUrl
        if (!amazonImageUrl) {
          console.log(`⚠️  Skipping ${product.name} - no image URL`)
          skipped++
          continue
        }

        console.log(`📥 Migrating ${product.name}...`)
        console.log(`   Image URL: ${amazonImageUrl?.substring(0, 100)}`)
        
        try {
          const r2ImageUrl = await storeAmazonImageInR2(amazonImageUrl, product.id, asin)

          if (r2ImageUrl) {
            // Update product with R2 URL
            await prisma.product.update({
              where: { id: product.id },
              data: { imageUrl: r2ImageUrl },
            })
            console.log(`✅ Migrated: ${product.name}`)
            console.log(`   ${product.imageUrl} → ${r2ImageUrl}\n`)
            migrated++
          } else {
            console.log(`❌ Failed to migrate: ${product.name} (storeAmazonImageInR2 returned null)\n`)
            failed++
          }
        } catch (error: any) {
          console.error(`❌ Error migrating ${product.name}:`, error.message || error)
          console.error(`   Full error:`, error)
          failed++
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Error migrating ${product.name}:`, error)
        failed++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`✅ Migrated: ${migrated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`\n✅ Migration complete!`)
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

migrateAmazonImagesToR2()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

