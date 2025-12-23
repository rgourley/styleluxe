/**
 * Product Enrichment Script
 * 
 * After collecting from all sources, this script:
 * 1. Matches products across sources (e.g., Reddit mentions + Amazon listing = same product)
 * 2. Enriches products with data from other sources (add Amazon URL to Reddit product, etc.)
 * 3. Combines trend scores from multiple sources
 * 4. Merges duplicate products
 */

import { prisma } from '../lib/prisma'

/**
 * Normalize product name for matching
 * Removes extra spaces, converts to lowercase, removes special chars
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
}

/**
 * Calculate similarity between two product names
 * Returns 0-1, where 1 is exact match
 * Improved matching for Amazon vs Reddit product names
 */
function nameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeProductName(name1)
  const norm2 = normalizeProductName(name2)
  
  if (norm1 === norm2) return 1.0
  
  // Extract brand names (usually first word or two)
  const words1 = norm1.split(/\s+/)
  const words2 = norm2.split(/\s+/)
  const brand1 = words1.slice(0, 2).join(' ')
  const brand2 = words2.slice(0, 2).join(' ')
  
  // If brands match, it's likely the same product (even if names differ)
  if (brand1 === brand2 && brand1.length > 3) {
    // Check if remaining words have overlap
    const rest1 = words1.slice(2).join(' ')
    const rest2 = words2.slice(2).join(' ')
    if (rest1 && rest2) {
      const words1Set = new Set(rest1.split(/\s+/))
      const words2Set = new Set(rest2.split(/\s+/))
      const intersection = new Set([...words1Set].filter(x => words2Set.has(x) && x.length > 3))
      if (intersection.size > 0) {
        return 0.85 // High confidence match
      }
    }
    return 0.7 // Brand match but different product names
  }
  
  // Check if one contains the other (partial match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length)
    const longer = Math.max(norm1.length, norm2.length)
    return Math.max(0.5, shorter / longer) // Lowered from 0.6 to 0.5
  }
  
  // Handle Reddit products that might have multiple products in one name
  // Split by common separators and try to match individual products
  const redditSeparators = ['  ', '\n', '|', '•', '-']
  for (const sep of redditSeparators) {
    if (norm1.includes(sep) || norm2.includes(sep)) {
      const parts1 = norm1.split(sep).map(p => p.trim()).filter(p => p.length > 3)
      const parts2 = norm2.split(sep).map(p => p.trim()).filter(p => p.length > 3)
      
      // Try to match any part from name1 with any part from name2
      for (const part1 of parts1) {
        for (const part2 of parts2) {
          if (part1.includes(part2) || part2.includes(part1)) {
            return 0.6 // Found a matching part
          }
          // Also check word overlap in parts
          const words1 = part1.split(/\s+/).filter(w => w.length > 2)
          const words2 = part2.split(/\s+/).filter(w => w.length > 2)
          const commonWords = words1.filter(w => words2.includes(w))
          if (commonWords.length >= 2) {
            return 0.55 // At least 2 common words
          }
        }
      }
    }
  }
  
  // Word overlap (Jaccard similarity)
  const words1Set = new Set(words1.filter(w => w.length > 2)) // Ignore short words
  const words2Set = new Set(words2.filter(w => w.length > 2))
  const intersection = new Set([...words1Set].filter(x => words2Set.has(x)))
  const union = new Set([...words1Set, ...words2Set])
  
  if (union.size === 0) return 0
  const jaccard = intersection.size / union.size
  
  // Boost score if there are significant keyword matches (3+ words in common)
  if (intersection.size >= 3) {
    return Math.min(0.9, jaccard + 0.2) // Boost by 0.2
  }
  
  return jaccard
}

/**
 * Match and enrich products across sources
 */
async function enrichProducts() {
  console.log('='.repeat(60))
  console.log('Starting product enrichment...')
  console.log('='.repeat(60))
  console.log()

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured. Cannot enrich products.')
    throw new Error('DATABASE_URL environment variable is not set')
  }

  try {
    // Test connection first
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw new Error('Cannot connect to database. Please check your DATABASE_URL and ensure the database is running.')
  }

  // Get all products that need enrichment
  let products
  try {
    products = await prisma.product.findMany({
      include: {
        trendSignals: true,
      },
    })
    console.log(`✅ Found ${products.length} products in database`)
  } catch (error) {
    console.error('❌ Error fetching products:', error)
    throw new Error('Failed to fetch products from database')
  }

  if (products.length === 0) {
    console.log('No products to process. Exiting.')
    return
  }

  let enriched = 0
  let merged = 0
  let flagged = 0

  // First, try to match products across sources (Amazon + Reddit)
  // This is more important than exact name matching
  console.log('Step 1: Cross-source matching (Amazon + Reddit)...\n')
  
  const amazonProducts = products.filter(p => 
    p.trendSignals?.some((s: any) => s.source === 'amazon_movers') &&
    !p.trendSignals?.some((s: any) => s.source === 'reddit_skincare')
  )
  const redditProducts = products.filter(p =>
    p.trendSignals?.some((s: any) => s.source === 'reddit_skincare') &&
    !p.trendSignals?.some((s: any) => s.source === 'amazon_movers')
  )
  
  console.log(`  Found ${amazonProducts.length} Amazon-only products`)
  console.log(`  Found ${redditProducts.length} Reddit-only products`)
  
  // Also check for Reddit products that have Amazon URLs but no Amazon signals
  const redditWithAmazonUrl = redditProducts.filter(p => p.amazonUrl)
  console.log(`  Reddit products with Amazon URLs: ${redditWithAmazonUrl.length}`)
  console.log(`  Attempting to match them...\n`)
  
  // Show sample products for debugging
  if (amazonProducts.length > 0 && redditProducts.length > 0) {
    console.log(`  Sample Amazon: "${amazonProducts[0].name}"`)
    console.log(`  Sample Reddit: "${redditProducts[0].name}"`)
    console.log(`  Similarity: ${nameSimilarity(amazonProducts[0].name, redditProducts[0].name).toFixed(2)}\n`)
  }
  
  let matchedCount = 0
  
  for (const amazonProduct of amazonProducts) {
    let bestMatch: typeof products[0] | null = null
    let bestSimilarity = 0
    
    // First, try to match by Amazon URL if Reddit product has one
    for (const redditProduct of redditProducts) {
      if (redditProduct.amazonUrl && amazonProduct.amazonUrl) {
        // Direct URL match is the most reliable
        if (redditProduct.amazonUrl === amazonProduct.amazonUrl) {
          bestMatch = redditProduct
          bestSimilarity = 1.0
          break
        }
        // Also check if URLs point to same product (same ASIN)
        const asin1 = redditProduct.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 
                     redditProduct.amazonUrl.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1]
        const asin2 = amazonProduct.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 
                     amazonProduct.amazonUrl.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1]
        if (asin1 && asin2 && asin1 === asin2) {
          bestMatch = redditProduct
          bestSimilarity = 1.0
          break
        }
      }
    }
    
    // If no URL match, try name similarity
    if (!bestMatch) {
      for (const redditProduct of redditProducts) {
        const similarity = nameSimilarity(amazonProduct.name, redditProduct.name)
        if (similarity > bestSimilarity && similarity > 0.25) { // Lowered threshold: 0.25
          bestSimilarity = similarity
          bestMatch = redditProduct
        }
      }
    }
    
    // Also try brand matching as fallback (more aggressive)
    if (!bestMatch || bestSimilarity < 0.25) {
      const amazonBrand = amazonProduct.brand || amazonProduct.name.split(' ')[0]
      for (const redditProduct of redditProducts) {
        const redditBrand = redditProduct.brand || redditProduct.name.split(' ')[0]
        if (amazonBrand && redditBrand && 
            normalizeProductName(amazonBrand) === normalizeProductName(redditBrand) &&
            amazonBrand.length > 2) { // Lowered from 3 to 2
          const similarity = nameSimilarity(amazonProduct.name, redditProduct.name)
          if (similarity > bestSimilarity) {
            bestSimilarity = Math.max(0.3, similarity) // Boost brand matches, lowered threshold
            bestMatch = redditProduct
          }
        }
      }
    }
    
    if (bestMatch && bestSimilarity > 0.25) { // Lowered threshold
      console.log(`  ✓ Matching: "${amazonProduct.name}" (Amazon) + "${bestMatch.name}" (Reddit) (similarity: ${bestSimilarity.toFixed(2)})`)
      
      // Transfer Reddit signals to Amazon product
      const redditSignals = bestMatch.trendSignals?.filter((s: any) => s.source === 'reddit_skincare') || []
      for (const signal of redditSignals) {
        await prisma.trendSignal.update({
          where: { id: signal.id },
          data: { productId: amazonProduct.id },
        })
      }
      
      // Update Amazon product with Reddit data if missing
      const updates: any = {}
      if (!amazonProduct.brand && bestMatch.brand) updates.brand = bestMatch.brand
      if (!amazonProduct.price && bestMatch.price) updates.price = bestMatch.price
      if (!amazonProduct.imageUrl && bestMatch.imageUrl) updates.imageUrl = bestMatch.imageUrl
      // Keep the better name (usually Amazon has more complete names)
      if (bestMatch.name && bestMatch.name.length > amazonProduct.name.length) {
        updates.name = bestMatch.name
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.product.update({
          where: { id: amazonProduct.id },
          data: updates,
        })
      }
      
      // Recalculate combined score after merging
      const allSignals = await prisma.trendSignal.findMany({
        where: { productId: amazonProduct.id },
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
        .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 100)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 2)
      const redditScore = Math.min(50, redditSignalsForScore.length * 25)
      const totalScore = amazonScore + redditScore
      
      await prisma.product.update({
        where: { id: amazonProduct.id },
        data: {
          trendScore: totalScore,
          status: totalScore >= 60 ? 'FLAGGED' : amazonProduct.status,
        },
      })
      
      // Delete the Reddit product (merged into Amazon product)
      await prisma.product.delete({ where: { id: bestMatch.id } })
      
      // Remove from redditProducts array so it's not matched again
      const index = redditProducts.indexOf(bestMatch)
      if (index > -1) redditProducts.splice(index, 1)
      
      matchedCount++
      merged++
    }
  }
  
  console.log(`\n  ✅ Matched ${matchedCount} Amazon + Reddit product pairs\n`)
  
  // Now group remaining products by normalized name for exact matches
  const productGroups = new Map<string, typeof products>()
  
  // Re-fetch products after merging
  const remainingProducts = await prisma.product.findMany({
    include: {
      trendSignals: true,
    },
  })

  for (const product of remainingProducts) {
    const normalized = normalizeProductName(product.name)
    if (!productGroups.has(normalized)) {
      productGroups.set(normalized, [])
    }
    productGroups.get(normalized)!.push(product)
  }

  // Process each group
  for (const [normalizedName, group] of productGroups.entries()) {
    if (group.length === 1) {
      // Single product - just enrich it with data from other sources if available
      const product = group[0]
      const wasUpdated = await enrichSingleProduct(product)
      if (wasUpdated) {
        enriched++
        // Check if product was flagged
        const updated = await prisma.product.findUnique({ where: { id: product.id } })
        if (updated?.status === 'FLAGGED') flagged++
      }
      continue
    }

    // Multiple products with similar names - try to merge them
    // Sort by trend score (keep the one with highest score as primary)
    group.sort((a, b) => b.trendScore - a.trendScore)
    const primary = group[0]
    const duplicates = group.slice(1)

    // Check if they're actually the same product
    // Lower threshold to 0.5 to catch more matches (Amazon vs Reddit names often differ)
    const shouldMerge = duplicates.some(dup => {
      const similarity = nameSimilarity(primary.name, dup.name)
      if (similarity > 0.5) { // Lowered from 0.6 to 0.5
        console.log(`  Matching: "${primary.name}" + "${dup.name}" (similarity: ${similarity.toFixed(2)})`)
        return true
      }
      return false
    })

    if (shouldMerge) {
      // Merge duplicates into primary product
      for (const dup of duplicates) {
        // Transfer trend signals
        await prisma.trendSignal.updateMany({
          where: { productId: dup.id },
          data: { productId: primary.id },
        })

        // Transfer reviews
        await prisma.review.updateMany({
          where: { productId: dup.id },
          data: { productId: primary.id },
        })

        // Update primary with best data from duplicate
        const updates: any = {}
        if (!primary.amazonUrl && dup.amazonUrl) updates.amazonUrl = dup.amazonUrl
        if (!primary.imageUrl && dup.imageUrl) updates.imageUrl = dup.imageUrl
        if (!primary.price && dup.price) updates.price = dup.price
        if (!primary.brand && dup.brand) updates.brand = dup.brand
        if (dup.trendScore > primary.trendScore) updates.trendScore = dup.trendScore

        if (Object.keys(updates).length > 0) {
          await prisma.product.update({
            where: { id: primary.id },
            data: updates,
          })
        }

        // Delete duplicate
        await prisma.product.delete({ where: { id: dup.id } })
        merged++
      }
    }
  }

  // Now enrich all products with cross-source data (after merging)
  const allProducts = await prisma.product.findMany({
    include: {
      trendSignals: true,
    },
  })
  
  console.log(`\nStep 2: Enriching ${allProducts.length} products with combined scores...\n`)

  let updatedCount = 0
  let flaggedCount = 0
  
  for (const product of allProducts) {
    const wasUpdated = await enrichSingleProduct(product)
    if (wasUpdated) {
      updatedCount++
      // Check if product was flagged
      const updated = await prisma.product.findUnique({ 
        where: { id: product.id },
        select: { status: true }
      })
      if (updated?.status === 'FLAGGED') flaggedCount++
    }
  }

  console.log(`\n✅ Product enrichment complete!`)
  console.log(`   - Enriched: ${enriched} products`)
  console.log(`   - Merged: ${merged} duplicate products`)
  console.log(`   - Updated scores: ${updatedCount} products`)
  console.log(`   - Flagged: ${flaggedCount} products (score >= 60 or strong single-source signal)`)
}

/**
 * Enrich a single product with data from other sources
 */
async function enrichSingleProduct(product: any) {
  const updates: any = {}
  const sources = product.trendSignals?.map((s: any) => s.source) || []

  // If product has Reddit signal but no Amazon URL, try to find Amazon listing
  if (sources.includes('reddit_skincare') && !product.amazonUrl) {
    // Could search Amazon API here, or leave for manual enrichment
    // For now, we'll just note it could be enriched
  }

  // If product has Amazon signal but no image, try to get from Amazon
  if (sources.includes('amazon_movers') && !product.imageUrl) {
    // Could fetch product image from Amazon
  }

  // Recalculate total trend score (Amazon + Reddit) from all signals
  if (product.trendSignals && product.trendSignals.length > 0) {
    let amazonScore = 0
    let redditScore = 0
    
    // Calculate Amazon score (50 points max)
    const amazonSignals = product.trendSignals.filter((s: any) => s.source === 'amazon_movers')
    for (const signal of amazonSignals) {
      const metadata = signal.metadata as any
      const salesJump = signal.value || metadata?.salesJumpPercent || 0
      if (salesJump > 0) {
        amazonScore = Math.min(50, Math.floor(salesJump / 30))
        break // Use highest Amazon score
      } else {
        // Base score for being on Movers & Shakers (even without specific %)
        amazonScore = 15
      }
    }
    
    // Calculate Reddit score (50 points max)
    const redditSignals = product.trendSignals
      .filter((s: any) => s.source === 'reddit_skincare' && (s.value || 0) > 100)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
      .slice(0, 2) // Max 2 posts
    
    // Give points based on upvotes
    for (const signal of redditSignals) {
      const upvotes = signal.value || 0
      if (upvotes > 300) {
        redditScore += 25
      } else if (upvotes >= 100) {
        // Partial credit for 100-300 upvotes
        redditScore += Math.max(10, Math.floor((upvotes / 300) * 25))
      }
    }
    redditScore = Math.min(50, redditScore) // Cap at 50
    
    // Total score = Amazon + Reddit (max 100)
    const totalScore = amazonScore + redditScore
    
    // Update trend score and status
    if (totalScore !== product.trendScore) {
      updates.trendScore = totalScore
      // Flag ONLY if combined score >= 60 (requires BOTH Amazon + Reddit signals)
      // This ensures we only review products with both social buzz AND sales momentum
      const shouldFlag = totalScore >= 60
      if (shouldFlag && product.status !== 'PUBLISHED') {
        updates.status = 'FLAGGED'
      } else if (!shouldFlag && product.status === 'FLAGGED') {
        updates.status = 'DRAFT'
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.product.update({
      where: { id: product.id },
      data: updates,
    })
  }
}

export { enrichProducts }

// Run if called directly
if (require.main === module) {
  enrichProducts()
    .then(() => {
      console.log('\n✅ Enrichment complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

