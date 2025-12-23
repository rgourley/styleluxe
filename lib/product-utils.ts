// Pure utility functions for product display (no Prisma imports)
// Safe to use in client components

export function getTrendEmoji(score: number): string {
  if (score >= 90) return '🔥🔥🔥'
  if (score >= 80) return '🔥🔥'
  if (score >= 70) return '🔥'
  if (score >= 60) return '📈'
  return '💫'
}

export function getTrendLabel(score: number): string {
  if (score >= 90) return 'Super Hot'
  if (score >= 80) return 'Very Hot'
  if (score >= 70) return 'Hot'
  if (score >= 60) return 'Rising'
  return 'Warming Up'
}

export function formatTrendDuration(signals: any[]): string {
  if (!signals || signals.length === 0) return ''
  
  const oldest = signals[signals.length - 1]?.detectedAt
  if (!oldest) return ''
  
  const days = Math.floor((Date.now() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Trending today'
  if (days === 1) return 'Trending for 1 day'
  return `Trending for ${days} days`
}

export function getSalesSpikePercent(signals: any[]): string | null {
  if (!signals) return null
  const salesSignal = signals.find(s => s.source === 'amazon_movers' && s.signalType === 'sales_spike')
  if (!salesSignal || !salesSignal.value) return null
  return `Sales up ${salesSignal.value.toFixed(0)}%`
}


