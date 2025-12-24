/**
 * Fix Product Names Script
 * 
 * Extracts actual product names from Amazon URLs for products that have
 * price ranges or invalid names stored.
 */

import { prisma } from '../lib/prisma'

async function fixProductNames() {
  console.log('Starting product name fix...\n')

  // Find products with price-range-like names
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: '$' } },
        { name: { contains: ' - $' } },
      ],
      amazonUrl: { not: null },
    },
  })

  console.log(`Found ${products.length} products with invalid names\n`)

  let fixed = 0

  for (const product of products) {
    if (!product.amazonUrl) continue

    try {
      // Extract product name from Amazon URL
      // Amazon URLs often have product names in the path like:
      // /dp/B0C2Y2WWQM/ref=... or /product-name/dp/B0C2Y2WWQM
      const urlMatch = product.amazonUrl.match(/\/dp\/[A-Z0-9]{10}/)
      if (!urlMatch) continue

      // Try to get product name from URL path before /dp/
      const pathParts = product.amazonUrl.split('/')
      const dpIndex = pathParts.findIndex(p => p.startsWith('dp'))
      
      if (dpIndex > 0) {
        // Product name might be in the part before /dp/
        const possibleName = pathParts[dpIndex - 1]
        
        // Clean up the name (replace hyphens with spaces, title case)
        if (possibleName && possibleName.length > 3 && !possibleName.match(/^[A-Z0-9]{10}$/)) {
          const cleanedName = possibleName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          
          // Update product with better name
          await prisma.product.update({
            where: { id: product.id },
            data: { name: cleanedName },
          })
          
          console.log(`✅ Fixed: "${product.name}" → "${cleanedName}"`)
          fixed++
        }
      }
    } catch (error) {
      console.error(`Error fixing product ${product.id}:`, error)
    }
  }

  console.log(`\n✅ Fixed ${fixed} product names`)
}

fixProductNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })






