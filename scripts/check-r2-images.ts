/**
 * Check if R2 images are valid and accessible
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'

async function checkR2Images() {
  console.log('🔍 Checking R2 images for products with missing images...\n')

  const productNames = [
    'Kojic Acid Dark Spot Remover Soap',
    'Vitamin Illuminating Serum',
    'Dr Melaxin Peeling Ampoule Exfoliating Blackheads'
  ]

  for (const productName of productNames) {
    const product = await prisma.product.findFirst({
      where: { name: { contains: productName, mode: 'insensitive' } },
      select: { id: true, name: true, imageUrl: true, amazonUrl: true },
    })

    if (!product) {
      console.log(`❌ ${productName}: Product not found`)
      continue
    }

    console.log(`\n📦 ${product.name}`)
    console.log(`   Image URL: ${product.imageUrl || 'NONE'}`)
    console.log(`   Amazon URL: ${product.amazonUrl || 'NONE'}`)

    if (product.imageUrl) {
      // Check if it's an R2 URL
      if (product.imageUrl.includes('r2.dev') || product.imageUrl.includes('r2.cloudflarestorage.com')) {
        console.log(`   ✓ Has R2 URL`)
        
        // Try to fetch the image to see if it's accessible
        try {
          const response = await fetch(product.imageUrl, { method: 'HEAD' })
          if (response.ok) {
            const contentType = response.headers.get('content-type')
            const contentLength = response.headers.get('content-length')
            console.log(`   ✓ Image is accessible (${contentType}, ${contentLength} bytes)`)
          } else {
            console.log(`   ❌ Image not accessible: HTTP ${response.status}`)
          }
        } catch (error: any) {
          console.log(`   ❌ Error checking image: ${error.message}`)
        }
      } else {
        console.log(`   ⚠️  Not an R2 URL (may be Amazon or other)`)
      }
    } else {
      console.log(`   ❌ No image URL set`)
    }
  }
}

checkR2Images()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

