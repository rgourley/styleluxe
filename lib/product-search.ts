/**
 * Product search utilities for matching product names
 */

import { prisma } from './prisma'

/**
 * Calculate similarity between two product names using simple word matching
 * Returns a score between 0 and 1 (1 = perfect match)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  // Normalize names: lowercase, remove extra spaces, remove common words
  const normalize = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const normalized1 = normalize(name1)
  const normalized2 = normalize(name2)

  // Exact match
  if (normalized1 === normalized2) {
    return 1.0
  }

  // Check if one contains the other (subset match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.8
  }

  // Word-based matching
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 2)
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 2)

  if (words1.length === 0 || words2.length === 0) {
    return 0
  }

  // Count matching words
  let matches = 0
  const usedWords = new Set<number>()

  for (const word1 of words1) {
    for (let i = 0; i < words2.length; i++) {
      if (usedWords.has(i)) continue

      const word2 = words2[i]
      
      // Exact word match
      if (word1 === word2) {
        matches++
        usedWords.add(i)
        break
      }
      
      // Partial word match (one word contains the other)
      if (word1.length > 3 && word2.length > 3) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches += 0.5
          usedWords.add(i)
          break
        }
      }
    }
  }

  // Calculate similarity score
  const maxWords = Math.max(words1.length, words2.length)
  return matches / maxWords
}

/**
 * Search for a product in our database by name
 * Returns the best matching product if similarity >= threshold
 * 
 * @param productName - Name of the product to search for
 * @param threshold - Minimum similarity score (0-1), default 0.6
 * @param excludeProductId - Product ID to exclude from results (current product)
 * @returns Matched product with slug, or null if no good match found
 */
export async function findProductByName(
  productName: string,
  threshold: number = 0.6,
  excludeProductId?: string
): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    // Get all published products with content
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        content: {
          isNot: null,
        },
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
      select: {
        id: true,
        name: true,
        content: {
          select: {
            slug: true,
          },
        },
      },
    })

    if (products.length === 0) {
      return null
    }

    // Calculate similarity for each product
    let bestMatch: { product: typeof products[0]; score: number } | null = null

    for (const product of products) {
      const score = calculateNameSimilarity(productName, product.name)
      
      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { product, score }
        }
      }
    }

    if (bestMatch && bestMatch.product.content?.slug) {
      return {
        id: bestMatch.product.id,
        name: bestMatch.product.name,
        slug: bestMatch.product.content.slug,
      }
    }

    return null
  } catch (error) {
    console.error('Error searching for product by name:', error)
    return null
  }
}

/**
 * Search for multiple products by name
 * Returns array of matched products with similarity scores
 * 
 * @param productNames - Array of product names to search for
 * @param threshold - Minimum similarity score (0-1), default 0.6
 * @param excludeProductId - Product ID to exclude from results
 * @returns Array of matched products with slugs and similarity scores
 */
export async function findProductsByNames(
  productNames: string[],
  threshold: number = 0.6,
  excludeProductId?: string
): Promise<Array<{ name: string; id: string; slug: string; score: number }>> {
  const matches: Array<{ name: string; id: string; slug: string; score: number }> = []

  for (const productName of productNames) {
    const match = await findProductByName(productName, threshold, excludeProductId)
    if (match) {
      // Recalculate score for the match
      const products = await prisma.product.findMany({
        where: { id: match.id },
        select: { name: true },
      })
      if (products.length > 0) {
        const score = calculateNameSimilarity(productName, products[0].name)
        matches.push({ ...match, score })
      }
    }
  }

  return matches
}

