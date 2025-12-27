/**
 * Match Amazon Products to Reddit Products
 * 
 * Simple approach: For each Amazon product, check if it matches
 * any existing Reddit-mentioned products in our database.
 * If yes, link them. If no, that's fine - Amazon data alone is valuable.
 */

import { prisma } from '../lib/prisma'

/**
 * Calculate name similarity between two product names
 * Returns a score between 0 and 1
 */
function nameSimilarity(name1: string, name2: string): number {
  const normalize = (name: string) => 
    name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '')
  
  const n1 = normalize(name1)
  const n2 = normalize(name2)
  
  // Exact match
  if (n1 === n2) return 1.0
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.8
  
  // Word overlap (Jaccard similarity)
  const words1 = new Set(n1.split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(n2.split(/\s+/).filter(w => w.length > 2))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  if (union.size === 0) return 0
  
  return intersection.size / union.size
}

/**
 * Extract brand from product name
 */
function extractBrand(name: string): string | null {
  const match = name.match(/^([A-Z][a-zA-Z\s&]+?)\s+/)
  return match ? match[1].trim() : null
}

/**
 * Match Amazon products to existing Reddit products
 */
export async function matchAmazonToReddit() {
  console.log('='.repeat(60))
  console.log('Matching Amazon Products to Reddit Products')
  console.log('='.repeat(60))
  console.log()
  
  // Get all Amazon products (those with Amazon signals but no Reddit signals)
  const amazonProducts = await prisma.product.findMany({
    where: {
      trendSignals: {
        some: {
          source: 'amazon_movers',
        },
      },
      NOT: {
        trendSignals: {
          some: {
            source: 'reddit_skincare',
          },
        },
      },
    },
    include: {
      trendSignals: true,
    },
  })
  
  console.log(`Found ${amazonProducts.length} Amazon products to check\n`)
  
  // Get all Reddit-only products (those with Reddit signals but no Amazon signals)
  const redditProducts = await prisma.product.findMany({
    where: {
      trendSignals: {
        some: {
          source: 'reddit_skincare',
        },
      },
      NOT: {
        trendSignals: {
          some: {
            source: 'amazon_movers',
          },
        },
      },
    },
    include: {
      trendSignals: true,
    },
  })
  
  console.log(`Found ${redditProducts.length} Reddit products to match against\n`)
  
  if (redditProducts.length === 0) {
    console.log('No Reddit products to match against. Run weekly Reddit scan first.')
    return
  }
  
  let matched = 0
  
  for (const amazonProduct of amazonProducts) {
    let bestMatch: typeof redditProducts[0] | null = null
    let bestScore = 0
    
    // Find best matching Reddit product
    for (const redditProduct of redditProducts) {
      // Try name similarity
      const nameScore = nameSimilarity(amazonProduct.name, redditProduct.name)
      
      // Try brand matching
      let brandScore = 0
      if (amazonProduct.brand && redditProduct.brand) {
        const brand1 = amazonProduct.brand.toLowerCase()
        const brand2 = redditProduct.brand.toLowerCase()
        if (brand1 === brand2) {
          brandScore = 0.5
        } else if (brand1.includes(brand2) || brand2.includes(brand1)) {
          brandScore = 0.3
        }
      } else if (amazonProduct.brand || redditProduct.brand) {
        // Extract brand from name if not set
        const amazonBrand = amazonProduct.brand || extractBrand(amazonProduct.name)
        const redditBrand = redditProduct.brand || extractBrand(redditProduct.name)
        
        if (amazonBrand && redditBrand) {
          const brand1 = amazonBrand.toLowerCase()
          const brand2 = redditBrand.toLowerCase()
          if (brand1 === brand2) {
            brandScore = 0.5
          } else if (brand1.includes(brand2) || brand2.includes(brand1)) {
            brandScore = 0.3
          }
        }
      }
      
      // Combined score
      const totalScore = nameScore * 0.7 + brandScore * 0.3
      
      if (totalScore > bestScore && totalScore > 0.4) { // 40% similarity threshold
        bestScore = totalScore
        bestMatch = redditProduct
      }
    }
    
    if (bestMatch) {
      console.log(`Matching: "${amazonProduct.name}"`)
      console.log(`  with: "${bestMatch.name}" (similarity: ${(bestScore * 100).toFixed(0)}%)`)
      
      // Transfer Reddit signals to Amazon product
      const redditSignals = bestMatch.trendSignals.filter(s => s.source === 'reddit_skincare')
      
      for (const signal of redditSignals) {
        await prisma.trendSignal.update({
          where: { id: signal.id },
          data: { productId: amazonProduct.id },
        })
      }
      
      // Update Amazon product with Reddit data if missing
      await prisma.product.update({
        where: { id: amazonProduct.id },
        data: {
          name: amazonProduct.name, // Keep Amazon name (usually more complete)
          brand: amazonProduct.brand || bestMatch.brand,
          price: amazonProduct.price || bestMatch.price,
          imageUrl: amazonProduct.imageUrl || bestMatch.imageUrl,
        },
      })
      
      // Recalculate total score
      const allSignals = await prisma.trendSignal.findMany({
        where: { productId: amazonProduct.id },
      })
      
      let amazonScore = 0
      for (const signal of allSignals) {
        if (signal.source === 'amazon_movers') {
          const metadata = signal.metadata as any
          const salesJump = signal.value || metadata?.salesJumpPercent || 0
          if (salesJump > 0) {
            amazonScore = Math.min(70, Math.floor(salesJump / 20))
          } else {
            amazonScore = 10
          }
          break
        }
      }
      
      const redditSignalsForScore = allSignals
        .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 2)
      const redditScore = Math.min(30, redditSignalsForScore.length * 15)
      const totalScore = amazonScore + redditScore
      
      await prisma.product.update({
        where: { id: amazonProduct.id },
        data: {
          trendScore: totalScore,
          status: totalScore >= 60 ? 'FLAGGED' : amazonProduct.status,
        },
      })
      
      // Delete the Reddit-only product (merged into Amazon product)
      await prisma.product.delete({ where: { id: bestMatch.id } })
      
      console.log(`  ✅ Matched! (Score: ${totalScore} = ${amazonScore} Amazon + ${redditScore} Reddit)\n`)
      matched++
    }
  }
  
  console.log('='.repeat(60))
  console.log(`✅ Matching complete!`)
  console.log(`   - Matched: ${matched} products`)
  console.log('='.repeat(60))
}

// Run if called directly
if (require.main === module) {
  matchAmazonToReddit()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}






