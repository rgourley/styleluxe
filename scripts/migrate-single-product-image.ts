/**
 * Migrate a single product's image to R2
 * Usage: npx tsx scripts/migrate-single-product-image.ts "Product Name"
 */

require('dotenv').config()

import { prisma } from '../lib/prisma'
import { storeAmazonImageInR2, extractASINFromUrl } from '../lib/image-storage'
import { getAmazonImageUrl } from '../lib/amazon-image'

async function migrateProductImage(productName: string) {
  console.log(`🔍 Searching for product: "${productName}"...\n`)

  // Find the product
  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: productName,
        mode: 'insensitive',
      },
    },
  })

  if (!product) {
    console.log(`❌ Product not found: "${productName}"`)
    return
  }

  console.log(`✅ Found product: ${product.name}`)
  console.log(`   ID: ${product.id}`)
  console.log(`   Current imageUrl: ${product.imageUrl || '(none)'}`)
  console.log(`   Amazon URL: ${product.amazonUrl || '(none)'}\n`)

  if (!product.imageUrl && !product.amazonUrl) {
    console.log(`❌ No image URL or Amazon URL found for this product`)
    return
  }

  // Determine the source image URL
  let sourceImageUrl: string | null = null

  // If imageUrl exists and is not already an R2 URL
  if (product.imageUrl && !product.imageUrl.includes('r2.dev') && !product.imageUrl.includes('r2.cloudflarestorage.com')) {
    sourceImageUrl = product.imageUrl
    console.log(`📷 Using existing imageUrl: ${sourceImageUrl}`)
  } else if (product.amazonUrl) {
    // Try to generate Amazon image URL from ASIN
    const asin = extractASINFromUrl(product.amazonUrl)
    if (asin) {
      sourceImageUrl = getAmazonImageUrl(product.amazonUrl)
      console.log(`📷 Generated Amazon image URL from ASIN: ${sourceImageUrl}`)
    } else {
      console.log(`❌ Could not extract ASIN from Amazon URL`)
      return
    }
  }

  if (!sourceImageUrl) {
    console.log(`❌ No valid source image URL found`)
    return
  }

  // Extract ASIN for filename generation
  const asin = extractASINFromUrl(product.amazonUrl || '')

  console.log(`\n🚀 Migrating image to R2...`)
  console.log(`   Source: ${sourceImageUrl}`)
  console.log(`   Product ID: ${product.id}`)
  console.log(`   ASIN: ${asin || '(none)'}\n`)

  try {
    const r2ImageUrl = await storeAmazonImageInR2(sourceImageUrl, product.id, asin || undefined)

    if (r2ImageUrl) {
      // Update the product with the R2 URL
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: r2ImageUrl },
      })

      console.log(`✅ Successfully migrated image to R2!`)
      console.log(`   New imageUrl: ${r2ImageUrl}\n`)
    } else {
      console.log(`❌ Failed to migrate image - storeAmazonImageInR2 returned null\n`)
    }
  } catch (error) {
    console.error(`❌ Error migrating image:`, error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get product name from command line arguments
const productName = process.argv[2]

if (!productName) {
  console.log('Usage: npx tsx scripts/migrate-single-product-image.ts "Product Name"')
  process.exit(1)
}

migrateProductImage(productName).catch(console.error)

