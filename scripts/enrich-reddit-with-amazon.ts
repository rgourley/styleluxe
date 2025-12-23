/**
 * Enrich Existing Reddit Products with Amazon Data
 * 
 * This script searches Amazon for existing Reddit-only products
 * and matches them with Amazon products.
 */

import { prisma } from '../lib/prisma'
import { searchAmazonProduct } from './search-amazon-product'

async function enrichRedditWithAmazon() {
  console.log('='.repeat(60))
  console.log('Enriching Reddit Products with Amazon Data')
  console.log('='.repeat(60))
  console.log()

  // Find all Reddit-only products (have Reddit signals but no Amazon URL)
  const redditProducts = await prisma.product.findMany({
    where: {
      OR: [
        { amazonUrl: null },
        { amazonUrl: { equals: '' } },
      ],
      trendSignals: {
        some: {
          source: 'reddit_skincare',
        },
      },
    },
    include: {
      trendSignals: true,
    },
  })

  console.log(`Found ${redditProducts.length} Reddit-only products to enrich\n`)

  let matched = 0
  let updated = 0
  let notFound = 0

  for (const product of redditProducts) {
    console.log(`Searching Amazon for: "${product.name}"`)
    
    const amazonResult = await searchAmazonProduct(product.name)
    
    if (!amazonResult) {
      console.log(`  ❌ Not found on Amazon\n`)
      notFound++
      continue
    }

    console.log(`  ✓ Found: "${amazonResult.name}"`)
    console.log(`    URL: ${amazonResult.amazonUrl}`)

    // Check if this Amazon product already exists in database
    const existingAmazon = await prisma.product.findFirst({
      where: {
        amazonUrl: amazonResult.amazonUrl,
      },
      include: {
        trendSignals: true,
      },
    })

    if (existingAmazon && existingAmazon.id !== product.id) {
      // Merge: Transfer Reddit signals to existing Amazon product
      console.log(`  → Merging with existing Amazon product`)
      
      const redditSignals = product.trendSignals.filter(s => s.source === 'reddit_skincare')
      
      for (const signal of redditSignals) {
        await prisma.trendSignal.update({
          where: { id: signal.id },
          data: { productId: existingAmazon.id },
        })
      }

      // Recalculate combined score
      const allSignals = await prisma.trendSignal.findMany({
        where: { productId: existingAmazon.id },
      })

      let amazonScore = 0
      for (const signal of allSignals) {
        if (signal.source === 'amazon_movers') {
          const metadata = signal.metadata as any
          const salesJump = signal.value || metadata?.salesJumpPercent || 0
          if (salesJump > 0) {
            amazonScore = Math.min(50, Math.floor(salesJump / 30))
          } else {
            amazonScore = 15
          }
          break
        }
      }

      const redditSignalsForScore = allSignals
        .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 2)
      const redditScore = Math.min(50, redditSignalsForScore.length * 25)
      const totalScore = amazonScore + redditScore

      // Update Amazon product
      await prisma.product.update({
        where: { id: existingAmazon.id },
        data: {
          trendScore: Math.max(existingAmazon.trendScore, totalScore),
          status: totalScore >= 60 ? 'FLAGGED' : existingAmazon.status,
          name: existingAmazon.name || amazonResult.name,
          brand: existingAmazon.brand || amazonResult.brand,
          price: existingAmazon.price || amazonResult.price,
          imageUrl: existingAmazon.imageUrl || amazonResult.imageUrl,
        },
      })

      // Delete the Reddit-only product (merged into Amazon)
      await prisma.product.delete({ where: { id: product.id } })

      console.log(`  ✓ Merged! Combined score: ${totalScore}\n`)
      matched++
    } else {
      // Update Reddit product with Amazon data
      await prisma.product.update({
        where: { id: product.id },
        data: {
          amazonUrl: amazonResult.amazonUrl,
          price: product.price || amazonResult.price,
          imageUrl: product.imageUrl || amazonResult.imageUrl,
          brand: product.brand || amazonResult.brand,
        },
      })

      console.log(`  ✓ Updated with Amazon data\n`)
      updated++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('='.repeat(60))
  console.log('Enrichment Complete!')
  console.log(`  - Matched with existing Amazon products: ${matched}`)
  console.log(`  - Updated with new Amazon data: ${updated}`)
  console.log(`  - Not found on Amazon: ${notFound}`)
  console.log('='.repeat(60))
}

enrichRedditWithAmazon()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })


