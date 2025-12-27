/**
 * Format Amazon review quotes for use in product content
 * Extracts authentic quotes with proper attribution
 */

import { Review } from '@prisma/client'

interface FormattedQuote {
  quote: string
  attribution: string
}

/**
 * Extract skin type from review content
 */
function extractSkinType(content: string): string | null {
  const skinTypePatterns = [
    /(?:i have|my|for) (sensitive|oily|dry|combination|normal|mature|acne-prone|rosacea|eczema|dehydrated) skin/gi,
    /(sensitive|oily|dry|combination|normal|mature|acne-prone|rosacea|eczema|dehydrated) skin/gi,
  ]
  
  for (const pattern of skinTypePatterns) {
    const match = content.match(pattern)
    if (match) {
      // Extract the skin type (usually the first word after "have/my/for" or before "skin")
      const skinType = match[0]
        .toLowerCase()
        .replace(/(?:i have|my|for|skin)/gi, '')
        .trim()
      if (skinType) {
        return skinType
      }
    }
  }
  
  return null
}

/**
 * Extract usage timeframe from review content
 */
function extractTimeframe(content: string): string | null {
  const timeframePatterns = [
    /(?:using|used|have been using|been using) (?:for|since) (\d+)\s*(day|days|week|weeks|month|months|year|years)/gi,
    /(\d+)\s*(day|days|week|weeks|month|months|year|years) (?:user|using|of use)/gi,
    /(?:after|within) (\d+)\s*(day|days|week|weeks|month|months)/gi,
  ]
  
  for (const pattern of timeframePatterns) {
    const match = content.match(pattern)
    if (match) {
      const num = match[1]
      const unit = match[2].toLowerCase()
      return `${num}-${unit} user`
    }
  }
  
  return null
}

/**
 * Clean up review text - fix minor typos but keep authentic voice
 */
function cleanReviewText(text: string): string {
  // Fix common typos but keep the authentic voice
  let cleaned = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\bi\b/gi, 'I') // Capitalize "I"
    .trim()
  
  // Don't over-clean - keep authentic mistakes and casual language
  return cleaned
}

/**
 * Format a single review quote with attribution
 */
function formatSingleQuote(review: Review): FormattedQuote | null {
  if (!review.content || review.content.length < 20) {
    return null
  }

  // Clean the quote but keep authentic voice
  const quote = cleanReviewText(review.content)
  
  // Extract context
  const skinType = extractSkinType(review.content)
  const timeframe = extractTimeframe(review.content)
  
  // Build attribution
  const attributionParts: string[] = []
  
  if (review.verified) {
    attributionParts.push('Verified purchase')
  } else {
    attributionParts.push('Amazon reviewer')
  }
  
  if (timeframe) {
    attributionParts.push(timeframe)
  }
  
  if (skinType) {
    attributionParts.push(skinType + ' skin')
  }
  
  // If no specific attribution, use generic
  const attribution = attributionParts.length > 0
    ? attributionParts.join(', ')
    : review.verified ? 'Verified buyer' : 'Amazon reviewer'
  
  return {
    quote,
    attribution,
  }
}

/**
 * Format review quotes for use in product content
 * Returns minimum 5 quotes if available, formatted according to requirements
 */
export function formatReviewQuotes(reviews: Review[]): FormattedQuote[] {
  if (!reviews || reviews.length === 0) {
    return []
  }

  // Filter for reviews with substantial content
  const validReviews = reviews.filter(r => 
    r.content && 
    r.content.length >= 20 && 
    r.content.length <= 500 // Prefer shorter, punchier quotes
  )

  // Prioritize verified purchases and helpful reviews
  const sortedReviews = validReviews.sort((a, b) => {
    // Verified purchases first
    if (a.verified && !b.verified) return -1
    if (!a.verified && b.verified) return 1
    
    // Then by helpful votes
    const aHelpful = a.helpful || 0
    const bHelpful = b.helpful || 0
    if (aHelpful !== bHelpful) return bHelpful - aHelpful
    
    // Then by rating (prefer 3-5 star reviews for balanced perspective)
    const aRating = a.rating || 0
    const bRating = b.rating || 0
    if (aRating >= 3 && bRating < 3) return -1
    if (aRating < 3 && bRating >= 3) return 1
    
    return 0
  })

  // Format quotes
  const formattedQuotes: FormattedQuote[] = []
  for (const review of sortedReviews) {
    const formatted = formatSingleQuote(review)
    if (formatted) {
      formattedQuotes.push(formatted)
      
      // Stop at 10 quotes max (we'll use top 5-7 in content)
      if (formattedQuotes.length >= 10) break
    }
  }

  return formattedQuotes
}

/**
 * Format quotes as markdown for use in content generation
 */
export function formatQuotesAsMarkdown(quotes: FormattedQuote[]): string {
  if (quotes.length === 0) {
    return ''
  }

  // Use top 5-7 quotes
  const quotesToUse = quotes.slice(0, Math.min(7, quotes.length))
  
  return quotesToUse
    .map(q => `"${q.quote}"\n- ${q.attribution}`)
    .join('\n\n')
}






