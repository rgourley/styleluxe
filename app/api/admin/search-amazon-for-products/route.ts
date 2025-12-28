import { NextResponse } from 'next/server'
import { searchAmazonProduct } from '@/lib/amazon-search'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/search-amazon-for-products
 * Searches Amazon for selected product mentions
 */
export async function POST(request: Request) {
  try {
    const { productMentions } = await request.json()

    if (!productMentions || !Array.isArray(productMentions) || productMentions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product mentions array is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Searching Amazon for ${productMentions.length} selected products...`)

    const results = []
    const startTime = Date.now()

    for (let i = 0; i < productMentions.length; i++) {
      const mention = productMentions[i]
      const progress = i + 1
      
      console.log(`[${progress}/${productMentions.length}] Searching: "${mention.productName}"`)

      // Add delay before each Amazon search to avoid rate limiting
      // 4-6 seconds between searches
      if (i > 0) {
        const delay = 4000 + Math.random() * 2000 // 4-6 seconds
        console.log(`  ⏳ Waiting ${Math.floor(delay / 1000)}s before search...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      let amazonMatch = null
      let confidence: 'high' | 'medium' | 'low' | 'none' = 'none'
      let existingProduct = null

      try {
        const searchStartTime = Date.now()
        const searchResult = await searchAmazonProduct(mention.productName)
        const searchTime = Date.now() - searchStartTime

        if (searchResult) {
          amazonMatch = searchResult
          console.log(`  ✅ Found: ${searchResult.name} (${searchTime}ms)`)

          // Check if product already exists
          const existing = await prisma.product.findFirst({
            where: {
              OR: [
                { amazonUrl: { contains: searchResult.amazonUrl } },
                { name: { contains: mention.productName, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              name: true,
              status: true,
              currentScore: true,
            },
          })

          if (existing) {
            existingProduct = existing
            confidence = 'high'
            console.log(`  ✅ Already exists in database: ${existing.name}`)
          } else {
            // Calculate confidence based on name similarity
            const nameSimilarity = calculateNameSimilarity(
              mention.productName.toLowerCase(),
              searchResult.name.toLowerCase()
            )

            if (nameSimilarity > 0.7) {
              confidence = 'high'
            } else if (nameSimilarity > 0.5) {
              confidence = 'medium'
            } else {
              confidence = 'low'
            }
            console.log(`  → Confidence: ${confidence} (${(nameSimilarity * 100).toFixed(0)}% similarity)`)
          }
        } else {
          console.log(`  ⚠️  No Amazon match found`)
        }
      } catch (error) {
        console.error(`  ❌ Error searching Amazon:`, error)
      }

      results.push({
        productMention: mention,
        amazonMatch,
        confidence,
        existingProduct,
      })
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000)
    const matched = results.filter(r => r.amazonMatch).length
    console.log(`✅ Completed: ${matched}/${productMentions.length} matched to Amazon (took ${totalTime}s)`)

    return NextResponse.json({
      success: true,
      results,
      message: `Searched ${productMentions.length} products, ${matched} matched to Amazon.`,
    })
  } catch (error) {
    console.error('Error searching Amazon for products:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to search Amazon',
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate similarity between two product names
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.split(/\s+/).filter(w => w.length > 2)
  const words2 = name2.split(/\s+/).filter(w => w.length > 2)

  if (words1.length === 0 || words2.length === 0) return 0

  let matches = 0
  for (const word of words1) {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matches++
    }
  }

  return matches / Math.max(words1.length, words2.length)
}

