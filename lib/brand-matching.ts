/**
 * Brand name normalization and fuzzy matching
 * Handles variations like "Laura Geller New York" vs "Laura Geller"
 */

/**
 * Normalize brand name by removing common suffixes and variations
 */
export function normalizeBrandName(brand: string): string {
  if (!brand) return ''
  
  let normalized = brand.trim()
  
  // Remove common location suffixes
  const locationSuffixes = [
    ' new york',
    ' ny',
    ' usa',
    ' united states',
    ' inc',
    ' inc.',
    ' llc',
    ' ltd',
    ' ltd.',
    ' corp',
    ' corp.',
    ' company',
    ' co',
    ' co.',
    ' & co',
    ' & co.',
    ' beauty',
    ' cosmetics',
    ' skincare',
    ' labs',
    ' laboratory',
  ]
  
  for (const suffix of locationSuffixes) {
    if (normalized.toLowerCase().endsWith(suffix.toLowerCase())) {
      normalized = normalized.substring(0, normalized.length - suffix.length).trim()
    }
  }
  
  return normalized
}

/**
 * Check if two brand names match (fuzzy)
 */
export function brandsMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false
  
  const normalized1 = normalizeBrandName(brand1).toLowerCase()
  const normalized2 = normalizeBrandName(brand2).toLowerCase()
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true
  
  // One contains the other (e.g., "Laura Geller" in "Laura Geller New York")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Make sure the shorter one is at least 3 characters (avoid false matches)
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2
    if (shorter.length >= 3) {
      return true
    }
  }
  
  // Word-based matching (e.g., "Laura Geller" matches "Laura Geller New York")
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 2)
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return false
  
  // If all words from shorter brand are in longer brand
  const shorterWords = words1.length <= words2.length ? words1 : words2
  const longerWords = words1.length > words2.length ? words1 : words2
  
  const allWordsMatch = shorterWords.every(word => 
    longerWords.some(longerWord => 
      longerWord.includes(word) || word.includes(longerWord)
    )
  )
  
  return allWordsMatch
}

/**
 * Get canonical brand name (preferred version)
 * Returns the shortest normalized version
 */
export function getCanonicalBrandName(brands: string[]): string {
  if (brands.length === 0) return ''
  
  const normalized = brands.map(b => ({
    original: b,
    normalized: normalizeBrandName(b),
  }))
  
  // Sort by length (shortest first) and return the shortest normalized version
  normalized.sort((a, b) => a.normalized.length - b.normalized.length)
  
  return normalized[0].normalized
}

/**
 * Find matching brand name from a list
 */
export function findMatchingBrand(
  targetBrand: string,
  brandList: string[]
): string | null {
  for (const brand of brandList) {
    if (brandsMatch(targetBrand, brand)) {
      return brand
    }
  }
  return null
}

