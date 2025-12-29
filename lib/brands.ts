import { prisma } from './prisma'
import { unstable_cache } from 'next/cache'
import { ensureSchemaSynced } from './auto-sync-schema'
import { normalizeBrandName, brandsMatch, getCanonicalBrandName } from './brand-matching'

/**
 * Convert brand name to URL-friendly slug
 */
export function brandToSlug(brand: string): string {
  // Use normalized brand name for slug consistency
  const normalized = normalizeBrandName(brand)
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Convert slug back to brand name (approximate)
 */
export function slugToBrand(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get all brands that have published products
 * Groups similar brand names together (e.g., "Laura Geller" and "Laura Geller New York")
 */
export async function getAllBrands(): Promise<Array<{ brand: string; count: number; slug: string }>> {
  await ensureSchemaSynced().catch(() => {})

  try {
    const brands = await prisma.product.groupBy({
      by: ['brand'],
      where: {
        status: 'PUBLISHED',
        brand: {
          not: null,
        },
        content: {
          isNot: null,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    const brandList = brands
      .filter(b => b.brand && b.brand.trim().length > 0)
      .map(b => ({
        original: b.brand!,
        count: b._count.id,
      }))

    // Group similar brands together
    const brandGroups: Map<string, { brands: string[]; totalCount: number }> = new Map()
    
    for (const item of brandList) {
      // Try to find existing group
      let foundGroup: string | null = null
      for (const [canonical, group] of brandGroups.entries()) {
        if (brandsMatch(item.original, canonical)) {
          foundGroup = canonical
          break
        }
      }
      
      if (foundGroup) {
        // Add to existing group
        const group = brandGroups.get(foundGroup)!
        if (!group.brands.includes(item.original)) {
          group.brands.push(item.original)
        }
        group.totalCount += item.count
      } else {
        // Create new group with canonical name
        const canonical = normalizeBrandName(item.original)
        brandGroups.set(canonical, {
          brands: [item.original],
          totalCount: item.count,
        })
      }
    }

    // Convert to final format
    return Array.from(brandGroups.entries())
      .map(([canonical, group]) => ({
        brand: canonical, // Use canonical (normalized) name
        count: group.totalCount,
        slug: brandToSlug(canonical),
      }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return []
  }
}

/**
 * Get products by brand name (with fuzzy matching)
 * Finds products with matching brand names (e.g., "Laura Geller" and "Laura Geller New York")
 */
export async function getProductsByBrand(
  brandName: string,
  limit: number = 50
): Promise<any[]> {
  await ensureSchemaSynced().catch(() => {})

  try {
    // First, get all unique brand names from database
    const allBrands = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        brand: {
          not: null,
        },
      },
      select: {
        brand: true,
      },
      distinct: ['brand'],
    })

    // Find all brands that match the target brand (fuzzy)
    const matchingBrands = allBrands
      .map(b => b.brand!)
      .filter(b => brandsMatch(b, brandName))

    if (matchingBrands.length === 0) {
      return []
    }

    // Get products for all matching brand variations
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        brand: {
          in: matchingBrands,
        },
        content: {
          isNot: null,
        },
      },
      include: {
        trendSignals: {
          orderBy: {
            detectedAt: 'desc',
          },
          take: 3,
        },
        reviews: {
          take: 5,
        },
        content: true,
        metadata: true,
      },
      orderBy: [
        {
          currentScore: 'desc',
        },
        {
          trendScore: 'desc',
        },
        {
          publishedAt: 'desc',
        },
      ],
      take: limit,
    })

    return products
  } catch (error) {
    console.error(`Error fetching products for brand ${brandName}:`, error)
    return []
  }
}

/**
 * Get brand name from slug (returns canonical/normalized name)
 */
export async function getBrandNameFromSlug(slug: string): Promise<string | null> {
  await ensureSchemaSynced().catch(() => {})

  try {
    // Get all unique brands
    const brands = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        brand: {
          not: null,
        },
      },
      select: {
        brand: true,
      },
      distinct: ['brand'],
    })

    // Find brand that matches slug (check normalized versions)
    const matchingBrands: string[] = []
    for (const product of brands) {
      if (product.brand && brandToSlug(product.brand) === slug) {
        matchingBrands.push(product.brand)
      }
    }

    if (matchingBrands.length === 0) {
      return null
    }

    // Return canonical (normalized) name
    return getCanonicalBrandName(matchingBrands)
  } catch (error) {
    console.error(`Error finding brand for slug ${slug}:`, error)
    return null
  }
}

