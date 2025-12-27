/**
 * Fix products with "Green up arrow, increased" names
 * Extract correct product names from their Amazon URLs
 */

import { prisma } from '../lib/prisma'

function extractNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    const dpIndex = pathParts.findIndex(p => p === 'dp' || p.startsWith('dp'))
    
    if (dpIndex > 0) {
      const urlName = pathParts[dpIndex - 1]
      if (urlName && urlName.length > 3 && !urlName.match(/^[A-Z0-9]{10}$/)) {
        // Decode URL-encoded characters and format
        const decodedName = decodeURIComponent(urlName)
          .split('-')
          .map(word => {
            // Handle special cases
            if (word.toLowerCase() === 'and') return '&'
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          })
          .join(' ')
        
        return decodedName
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

async function fixGreenArrowProducts() {
  console.log('🔍 Finding products with "Green up arrow" names...\n')
  
  const products = await prisma.product.findMany({
    where: {
      name: { contains: 'Green up arrow', mode: 'insensitive' },
    },
    include: {
      content: true,
    },
  })
  
  console.log(`Found ${products.length} products to fix\n`)
  
  let fixed = 0
  let skipped = 0
  
  for (const product of products) {
    if (!product.amazonUrl) {
      console.log(`⚠️  Skipping ${product.id} - no Amazon URL`)
      skipped++
      continue
    }
    
    const correctName = extractNameFromUrl(product.amazonUrl)
    
    if (!correctName || correctName.length < 3) {
      console.log(`⚠️  Could not extract name from URL: ${product.amazonUrl}`)
      skipped++
      continue
    }
    
    // Check if another product already has this name (to avoid duplicates)
    const existing = await prisma.product.findFirst({
      where: {
        name: correctName,
        id: { not: product.id },
      },
    })
    
    if (existing) {
      console.log(`⚠️  Product with name "${correctName}" already exists (${existing.id})`)
      console.log(`   Merging ${product.id} into ${existing.id}...`)
      
      // Transfer signals
      await prisma.trendSignal.updateMany({
        where: { productId: product.id },
        data: { productId: existing.id },
      })
      
      // Transfer reviews
      await prisma.review.updateMany({
        where: { productId: product.id },
        data: { productId: existing.id },
      })
      
      // Transfer content if existing doesn't have it
      const productContent = await prisma.productContent.findUnique({
        where: { productId: product.id },
      })
      const existingContent = await prisma.productContent.findUnique({
        where: { productId: existing.id },
      })
      
      if (productContent && !existingContent) {
        await prisma.productContent.update({
          where: { id: productContent.id },
          data: { productId: existing.id },
        })
      }
      
      // Delete duplicate
      await prisma.product.delete({ where: { id: product.id } })
      console.log(`   ✅ Merged and deleted`)
      fixed++
    } else {
      // Update product name
      await prisma.product.update({
        where: { id: product.id },
        data: { name: correctName },
      })
      console.log(`✅ Fixed: "${product.name}" → "${correctName}"`)
      fixed++
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} products`)
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} products`)
  }
  
  await prisma.$disconnect()
}

fixGreenArrowProducts().catch(console.error)

