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
 * 
 * For products that dropped off M&S, apply faster decay:
 * Days 0-1: multiplier = 0.9 (faster initial decay)
 * Days 2-3: multiplier = 0.8 (faster decay)
 * Days 4-7: multiplier = 0.65 (much faster decay)
 * Days 8-14: multiplier = 0.5 (very fast decay)
 * Days 15+: multiplier = 0.3 (heavy decay, but still visible)
 */
export function getAgeMultiplier(daysTrending: number, droppedOffMS: boolean = false): number {
  if (droppedOffMS) {
    // Faster decay for products that dropped off M&S
    if (daysTrending <= 1) return 0.9   // Day 0-1: 90% (faster initial decay)
    if (daysTrending <= 3) return 0.8   // Day 2-3: 80% (faster decay)
    if (daysTrending <= 7) return 0.65  // Day 4-7: 65% (much faster decay)
    if (daysTrending <= 14) return 0.5  // Day 8-14: 50% (very fast decay)
    if (daysTrending <= 30) return 0.3  // Day 15-30: 30% (heavy decay)
    return 0.2 // Days 31+: 20% (still visible but low)
  }
  
  // Normal decay for products still on M&S or never on M&S
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
 * Calculate traffic boost from page views and clicks
 * Reasonable rate: 
 * - 100 views = +1 point (max +10 points)
 * - 10 clicks = +1 point (max +5 points)
 * - Total max boost: +15 points
 */
export function calculateTrafficBoost(
  pageViews: number | null | undefined,
  clicks: number | null | undefined
): number {
  const views = pageViews || 0
  const clickCount = clicks || 0
  
  // View boost: 100 views = +1 point, capped at +10 points (1000 views)
  const viewBoost = Math.min(10, Math.floor(views / 100))
  
  // Click boost: 10 clicks = +1 point, capped at +5 points (50 clicks)
  const clickBoost = Math.min(5, Math.floor(clickCount / 10))
  
  return viewBoost + clickBoost
}

/**
 * Calculate current score with age decay and traffic boost applied
 * 
 * @param baseScore - Base score before decay
 * @param firstDetected - When product was first detected
 * @param pageViews - Optional page views for traffic boost
 * @param clicks - Optional clicks for traffic boost
 * @param droppedOffMS - Whether product dropped off Movers & Shakers (faster decay)
 */
export function calculateCurrentScore(
  baseScore: number | null | undefined,
  firstDetected: Date | null | undefined,
  pageViews?: number | null | undefined,
  clicks?: number | null | undefined,
  droppedOffMS?: boolean
): AgeDecayResult {
  const daysTrending = calculateDaysTrending(firstDetected)
  const ageMultiplier = getAgeMultiplier(daysTrending, droppedOffMS || false)
  
  const base = baseScore || 0
  const decayedScore = base * ageMultiplier
  
  // Add traffic boost (reasonable rate)
  const trafficBoost = calculateTrafficBoost(pageViews, clicks)
  
  // Final score = decayed score + traffic boost (capped at 100, no minimum - can decay to zero over time)
  const currentScore = Math.min(100, Math.round(decayedScore + trafficBoost))
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





