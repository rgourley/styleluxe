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
 * Days 0-3: multiplier = 1.0 (full score)
 * Days 4-7: multiplier = 0.8
 * Days 8-14: multiplier = 0.6
 * Days 15-21: multiplier = 0.4
 * Days 22-30: multiplier = 0.2
 * Days 31+: Remove from homepage (multiplier = 0)
 */
export function getAgeMultiplier(daysTrending: number): number {
  if (daysTrending <= 3) return 1.0
  if (daysTrending <= 7) return 0.8
  if (daysTrending <= 14) return 0.6
  if (daysTrending <= 21) return 0.4
  if (daysTrending <= 30) return 0.2
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

