/**
 * Age-based decay calculation for trending products
 * Products lose relevance over time to keep homepage fresh
 */

export interface AgeDecayResult {
  currentScore: number
  ageMultiplier: number
  daysTrending: number
  shouldShowOnHomepage: boolean
}

/**
 * Calculate age decay multiplier based on days trending
 * 
 * More aggressive decay curve for dynamic homepage:
 * Days 0-1: multiplier = 1.0 (full score - "Just detected")
 * Days 2-3: multiplier = 0.95 (slight decay)
 * Days 4-7: multiplier = 0.85 (moderate decay)
 * Days 8-14: multiplier = 0.7 (significant decay)
 * Days 15-21: multiplier = 0.5 (heavy decay)
 * Days 22-30: multiplier = 0.3 (very heavy decay)
 * Days 31+: Remove from homepage (multiplier = 0)
 */
export function getAgeMultiplier(daysTrending: number): number {
  if (daysTrending <= 1) return 1.0   // Day 0-1: Full score
  if (daysTrending <= 3) return 0.95  // Day 2-3: Slight decay
  if (daysTrending <= 7) return 0.85  // Day 4-7: Moderate decay
  if (daysTrending <= 14) return 0.7  // Day 8-14: Significant decay
  if (daysTrending <= 21) return 0.5  // Day 15-21: Heavy decay
  if (daysTrending <= 30) return 0.3  // Day 22-30: Very heavy decay
  return 0 // Days 31+: Remove from homepage
}

/**
 * Calculate days since first detected
 */
export function calculateDaysTrending(firstDetected: Date | null | undefined): number {
  if (!firstDetected) return 0
  const now = new Date()
  const diffTime = now.getTime() - firstDetected.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Calculate current score with age decay applied
 */
export function calculateCurrentScore(
  baseScore: number | null | undefined,
  firstDetected: Date | null | undefined
): AgeDecayResult {
  const daysTrending = calculateDaysTrending(firstDetected)
  const ageMultiplier = getAgeMultiplier(daysTrending)
  
  const base = baseScore || 0
  const currentScore = Math.round(base * ageMultiplier)
  const shouldShowOnHomepage = daysTrending <= 30 && currentScore >= 40

  return {
    currentScore,
    ageMultiplier,
    daysTrending,
    shouldShowOnHomepage,
  }
}

/**
 * Get timeline display text based on days trending
 */
export function getTimelineText(daysTrending: number): string {
  if (daysTrending === 0) return 'New today'
  if (daysTrending === 1) return 'Just detected'
  if (daysTrending <= 7) return `Trending for ${daysTrending} days`
  if (daysTrending <= 14) return `Hot for ${daysTrending} days`
  return `Peaked ${daysTrending} days ago`
}

/**
 * Get trend indicator badge based on current score
 */
export function getTrendBadge(currentScore: number | null | undefined): {
  emoji: string
  label: string
  color: string
} {
  const score = currentScore || 0
  
  if (score >= 80) {
    return { emoji: '🔥🔥🔥', label: 'Peak Viral', color: 'red' }
  }
  if (score >= 60) {
    return { emoji: '🔥🔥', label: 'Hot', color: 'orange' }
  }
  if (score >= 40) {
    return { emoji: '🔥', label: 'Rising', color: 'yellow' }
  }
  
  return { emoji: '📈', label: 'Watching', color: 'gray' }
}

/**
 * Update peak score if current score is higher
 */
export function updatePeakScore(
  currentScore: number,
  existingPeakScore: number | null | undefined
): number {
  if (!existingPeakScore) return currentScore
  return Math.max(currentScore, existingPeakScore)
}





