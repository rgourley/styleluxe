/**
 * Extract Product Name from Amazon URL
 * 
 * Amazon URLs often contain product names in the path.
 * This script extracts and updates product names from URLs.
 */

import { prisma } from '../lib/prisma'

function extractNameFromAmazonUrl(url: string): string | null {
  try {
    // Amazon URL patterns:
    // https://www.amazon.com/Product-Name-Here/dp/B0C2Y2WWQM
    // https://www.amazon.com/dp/B0C2Y2WWQM/ref=...
    
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    
    // Find the /dp/ part
    const dpIndex = pathParts.findIndex(p => p === 'dp' || p.startsWith('dp'))
    
    if (dpIndex > 0) {
      // Product name is usually before /dp/
      const namePart = pathParts[dpIndex - 1]
      
      if (namePart && namePart.length > 3 && !namePart.match(/^[A-Z0-9]{10}$/)) {
        // Convert URL-friendly name to readable name
        // e.g., "African-Exfoliating-Scrubber" -> "African Exfoliating Scrubber"
        const readableName = namePart
          .split('-')
          .map(word => {
            // Handle special cases
            if (word.toLowerCase() === 'and') return '&'
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          })
          .join(' ')
        
        return readableName
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

async function updateProductNamesFromUrls() {
  console.log('Extracting product names from Amazon URLs...\n')

  const products = await prisma.product.findMany({
    where: {
      amazonUrl: { not: null },
      OR: [
        { name: { startsWith: '$' } },
        { name: { contains: ' - $' } },
        { name: { contains: 'Missing' } },
      ],
    },
  })

  console.log(`Found ${products.length} products to fix\n`)

  let updated = 0

  for (const product of products) {
    if (!product.amazonUrl) continue

    const extractedName = extractNameFromAmazonUrl(product.amazonUrl)
    
    if (extractedName && extractedName.length > 3) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { name: extractedName },
        })
        console.log(`✅ "${product.name}" → "${extractedName}"`)
        updated++
      } catch (error) {
        console.error(`Error updating ${product.id}:`, error)
      }
    } else {
      console.log(`⚠️  Could not extract name from: ${product.amazonUrl}`)
    }
  }

  console.log(`\n✅ Updated ${updated} product names`)
}

updateProductNamesFromUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })


