/**
 * Review-based score adjustments
 * Factors in Amazon review ratings and review counts to adjust product scores
 */

/**
 * Calculate score adjustment based on Amazon review rating
 * 
 * High ratings (4.5-5.0 stars) = positive adjustment (up to +10 points)
 * Low ratings (< 3.5 stars) = negative adjustment (up to -10 points)
 * Review count affects the reliability of the rating
 * 
 * @param starRating - Amazon star rating (1-5)
 * @param reviewCount - Total number of reviews
 * @returns Score adjustment (-10 to +10 points)
 */
export function calculateReviewScoreAdjustment(
  starRating: number | null | undefined,
  reviewCount: number | null | undefined
): number {
  if (!starRating || starRating <= 0 || starRating > 5) {
    return 0 // No adjustment if rating is invalid
  }

  // Minimum review count to trust the rating
  const minReviewsForReliability = 10
  
  // If review count is too low, reduce the adjustment
  const reviewReliability = reviewCount && reviewCount >= minReviewsForReliability 
    ? 1.0  // Full weight for ratings with 10+ reviews
    : (reviewCount && reviewCount > 0) 
      ? Math.min(1.0, reviewCount / minReviewsForReliability)  // Partial weight for fewer reviews
      : 0.3  // Very low weight if no review count data

  // Calculate base adjustment based on rating
  let adjustment = 0
  
  // High ratings (4.5-5.0) = positive adjustment
  if (starRating >= 4.5) {
    // 5.0 stars = +10 points, 4.5 stars = +5 points (linear interpolation)
    adjustment = 5 + ((starRating - 4.5) / 0.5) * 5  // +5 to +10 points
  }
  // Good ratings (4.0-4.4) = small positive adjustment
  else if (starRating >= 4.0) {
    // 4.4 stars = +5 points, 4.0 stars = +2 points
    adjustment = 2 + ((starRating - 4.0) / 0.4) * 3  // +2 to +5 points
  }
  // Average ratings (3.5-3.9) = neutral (0 points)
  else if (starRating >= 3.5) {
    adjustment = 0  // Neutral - no adjustment
  }
  // Low ratings (3.0-3.4) = small negative adjustment
  else if (starRating >= 3.0) {
    // 3.4 stars = 0 points, 3.0 stars = -3 points
    adjustment = -3 + ((starRating - 3.0) / 0.4) * 3  // -3 to 0 points
  }
  // Very low ratings (< 3.0) = negative adjustment
  else {
    // 3.0 stars = -3 points, 1.0 stars = -10 points
    adjustment = -3 - ((3.0 - starRating) / 2.0) * 7  // -3 to -10 points
  }

  // Apply review reliability multiplier
  return Math.round(adjustment * reviewReliability)
}

/**
 * Calculate score adjustment based on review count trends
 * (Future: Track review count changes over time)
 * 
 * For now, this gives a small boost for products with many recent reviews
 * indicating high purchase volume
 * 
 * @param reviewCount - Total number of reviews
 * @param recentReviewCount - Number of reviews in the last month (if available)
 * @returns Score adjustment (0 to +5 points)
 */
export function calculateReviewCountTrendAdjustment(
  reviewCount: number | null | undefined,
  recentReviewCount?: number | null | undefined
): number {
  if (!reviewCount || reviewCount <= 0) {
    return 0
  }

  // If we have recent review count data, use it for trend analysis
  if (recentReviewCount && recentReviewCount > 0) {
    // High recent review count indicates strong current purchase volume
    // 100+ reviews this month = +5 points, 50+ = +3 points, 20+ = +1 point
    if (recentReviewCount >= 100) {
      return 5
    } else if (recentReviewCount >= 50) {
      return 3
    } else if (recentReviewCount >= 20) {
      return 1
    }
    return 0
  }

  // Fallback: Use total review count as proxy for popularity
  // Products with many reviews likely have steady purchase volume
  // 10,000+ reviews = +3 points, 5,000+ = +2 points, 1,000+ = +1 point
  if (reviewCount >= 10000) {
    return 3
  } else if (reviewCount >= 5000) {
    return 2
  } else if (reviewCount >= 1000) {
    return 1
  }

  return 0
}

/**
 * Combined review-based score adjustment
 * 
 * @param starRating - Amazon star rating (1-5)
 * @param reviewCount - Total number of reviews
 * @param recentReviewCount - Number of reviews in the last month (optional)
 * @returns Total score adjustment (-10 to +15 points)
 */
export function calculateCombinedReviewAdjustment(
  starRating: number | null | undefined,
  reviewCount: number | null | undefined,
  recentReviewCount?: number | null | undefined
): number {
  const ratingAdjustment = calculateReviewScoreAdjustment(starRating, reviewCount)
  const countAdjustment = calculateReviewCountTrendAdjustment(reviewCount, recentReviewCount)
  
  return ratingAdjustment + countAdjustment
}

