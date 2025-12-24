/**
 * Generate product review content using Claude AI
 * Uses the Alex Chen voice/style guide
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { searchRedditForQuotes } from './search-reddit-quotes'
import { searchAmazonProduct } from './amazon-search'
import { formatReviewQuotes, formatQuotesAsMarkdown } from './format-review-quotes'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ProductData {
  id: string
  name: string
  brand: string | null
  price: number | null
  amazonUrl: string | null
  trendSignals: Array<{
    source: string
    value: number | null
    metadata: any
  }>
  reviews: Array<{
    rating: number | null
    content: string
    author: string | null
    verified?: boolean
    helpful?: number | null
  }>
  metadata?: {
    starRating?: number | null
    totalReviewCount?: number | null
    positiveThemes?: string[] | null
    negativeThemes?: string[] | null
    specificDetails?: {
      skinTypes?: string[]
      useCases?: string[]
      timeframes?: string[]
    } | null
    memorableQuotes?: string[] | null
  } | null
  questions?: Array<{
    question: string
    answer?: string | null
  }> | null
}

/**
 * Generate a URL slug from product name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100)
}

/**
 * Build context about the product from trend signals and reviews
 */
function buildProductContext(product: ProductData): string {
  const context: string[] = []
  
  // Amazon signals
  const amazonSignals = product.trendSignals.filter(s => s.source === 'amazon_movers')
  let hasSpecificSalesData = false
  for (const signal of amazonSignals) {
    const metadata = signal.metadata as any
    const salesJump = signal.value || metadata?.salesJumpPercent || 0
    if (salesJump > 0) {
      context.push(`Amazon sales jumped ${salesJump}% - it's on Movers & Shakers`)
      hasSpecificSalesData = true
    }
  }
  
  // If we have Amazon signals but no specific sales jump data, be vague
  if (amazonSignals.length > 0 && !hasSpecificSalesData) {
    context.push(`Getting more popular on Amazon`)
  }
  
  // Reddit signals
  const redditSignals = product.trendSignals.filter(s => s.source === 'reddit_skincare')
  if (redditSignals.length > 0) {
    const topReddit = redditSignals
      .sort((a, b) => (b.value || 0) - (a.value || 0))[0]
    const metadata = topReddit.metadata as any
    if (metadata?.upvotes) {
      context.push(`Reddit post with ${metadata.upvotes} upvotes in r/${metadata.subreddit || 'SkincareAddiction'}`)
    }
  }
  
  // Reviews summary
  if (product.reviews.length > 0) {
    const avgRating = product.reviews
      .filter(r => r.rating)
      .reduce((sum, r) => sum + (r.rating || 0), 0) / product.reviews.filter(r => r.rating).length
    
    if (avgRating > 0) {
      context.push(`${product.reviews.length} reviews with average rating ${avgRating.toFixed(1)}/5`)
    } else {
      context.push(`${product.reviews.length} reviews available`)
    }
  }
  
  return context.join('. ') || 'Trending product with growing interest'
}

/**
 * Post-process alternatives text to add Amazon links for products mentioned
 */
async function processAlternativesWithLinks(alternativesText: string): Promise<string> {
  if (!alternativesText || alternativesText.trim() === '') {
    return alternativesText
  }

  // Split by lines to process each alternative
  const lines = alternativesText.split('\n')
  const processedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) {
      processedLines.push('')
      continue
    }
    
    // Check if this line starts with a label (Budget:, Luxury:, Different approach:)
    const labelMatch = line.match(/^(Budget|Luxury|Different approach):\s*(.+)$/i)
    
    if (labelMatch) {
      const label = labelMatch[1]
      const restOfLine = labelMatch[2]
      
      // Extract product name and price (format: "Product Name ($price)" or just "Product Name")
      const productMatch = restOfLine.match(/^(.+?)\s*\(?\$?(\d+(?:\.\d+)?)\)?\s*-?\s*(.+)?$/i)
      
      if (productMatch) {
        const productName = productMatch[1].trim()
        const price = productMatch[2] ? `$${productMatch[2]}` : ''
        const explanation = productMatch[3]?.trim() || ''
        
        // Check if there's already a markdown link
        const hasLink = /\[.*?\]\(https?:\/\/.*?\)/.test(restOfLine)
        
        if (!hasLink && productName) {
          // Search Amazon for this product (with timeout per search)
          console.log(`Searching Amazon for alternative: "${productName}"`)
          try {
            const amazonSearchPromise = searchAmazonProduct(productName)
            const amazonTimeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                console.log(`Amazon search for "${productName}" timed out, using search URL`)
                resolve(null)
              }, 5000) // 5 seconds per search
            })
            
            const amazonResult = await Promise.race([amazonSearchPromise, amazonTimeoutPromise])
            
            if (amazonResult && amazonResult.amazonUrl) {
              // Format with markdown link
              const linkText = price ? `${productName} (${price})` : productName
              const formattedLine = `**${label}:** [${linkText}](${amazonResult.amazonUrl})${explanation ? ` - ${explanation}` : ''}`
              processedLines.push(formattedLine)
            } else {
              // Fallback: create search URL
              const searchQuery = encodeURIComponent(productName.replace(/\s+/g, '+'))
              const searchUrl = `https://www.amazon.com/s?k=${searchQuery}`
              const linkText = price ? `${productName} (${price})` : productName
              const formattedLine = `**${label}:** [${linkText}](${searchUrl})${explanation ? ` - ${explanation}` : ''}`
              processedLines.push(formattedLine)
            }
          } catch (error) {
            // If search fails, use search URL fallback
            console.error(`Amazon search failed for "${productName}":`, error)
            const searchQuery = encodeURIComponent(productName.replace(/\s+/g, '+'))
            const searchUrl = `https://www.amazon.com/s?k=${searchQuery}`
            const linkText = price ? `${productName} (${price})` : productName
            const formattedLine = `**${label}:** [${linkText}](${searchUrl})${explanation ? ` - ${explanation}` : ''}`
            processedLines.push(formattedLine)
          }
        } else {
          // Already has a link or can't extract product name, keep as is but ensure proper formatting
          const formattedLine = `**${label}:** ${restOfLine}`
          processedLines.push(formattedLine)
        }
      } else {
        // Can't parse, but ensure label is bold
        const formattedLine = line.replace(/^(Budget|Luxury|Different approach):/i, (match) => `**${match}**`)
        processedLines.push(formattedLine)
      }
    } else {
      // Regular line, keep as is
      processedLines.push(line)
    }
  }
  
  // Join with double newlines between alternatives for better spacing
  return processedLines.join('\n\n')
}

/**
 * Generate product review content using Claude
 */
export async function generateProductContent(
  product: ProductData,
  redditQuotes?: Array<{ text: string; sentiment: 'positive' | 'negative' | 'neutral'; upvotes: number; subreddit: string }>,
  editorNotes?: string | null,
  googleTrendsData?: any | null
): Promise<{
  hook: string
  whyTrending: string
  whatItDoes: string
  theGood: string
  theBad: string
  whoShouldTry: string
  whoShouldSkip: string
  alternatives: string
  whatRealUsersSay: string
  faq: Array<{ question: string; answer: string }>
}> {
  const productContext = buildProductContext(product)
  const priceText = product.price ? `$${product.price.toFixed(2)}` : 'price not available'
  
  // Get Amazon review data
  const amazonReviews = product.reviews.filter(r => r.content && r.content.length > 20)
  const verifiedReviews = amazonReviews.filter(r => r.verified)
  const totalReviewCount = product.metadata?.totalReviewCount || amazonReviews.length
  const starRating = product.metadata?.starRating
  
  // Format review quotes according to requirements
  const formattedQuotes = formatReviewQuotes(amazonReviews as any)
  const quotesMarkdown = formatQuotesAsMarkdown(formattedQuotes)
  
  // Get review themes
  const positiveThemes = product.metadata?.positiveThemes || []
  const negativeThemes = product.metadata?.negativeThemes || []
  const specificDetails = product.metadata?.specificDetails
  const memorableQuotes = product.metadata?.memorableQuotes || []
  
  // Sample reviews for context (prioritize verified, helpful reviews)
  const topReviews = amazonReviews
    .sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
    .slice(0, 10)
    .map(r => r.content.substring(0, 300))
    .join('\n\n')
  
  // Format Reddit quotes (if available)
  let redditQuotesText = ''
  const hasRedditData = redditQuotes && redditQuotes.length > 0
  
  if (hasRedditData) {
    const positiveQuotes = redditQuotes.filter(q => q.sentiment === 'positive').slice(0, 5)
    const negativeQuotes = redditQuotes.filter(q => q.sentiment === 'negative').slice(0, 5)
    
    if (positiveQuotes.length > 0) {
      redditQuotesText += '\n**Positive Reddit Quotes:**\n'
      positiveQuotes.forEach((q, i) => {
        redditQuotesText += `${i + 1}. "${q.text}" (r/${q.subreddit}, ${q.upvotes} upvotes)\n`
      })
    }
    
    if (negativeQuotes.length > 0) {
      redditQuotesText += '\n**Negative Reddit Quotes:**\n'
      negativeQuotes.forEach((q, i) => {
        redditQuotesText += `${i + 1}. "${q.text}" (r/${q.subreddit}, ${q.upvotes} upvotes)\n`
      })
    }
    
    redditQuotesText += '\n**Important:** Use these real Reddit quotes naturally in your review. Reference them like "One Redditor said..." or "People on r/SkincareAddiction mentioned..." but synthesize them - don\'t just list them.\n'
  }
  
  // Format Amazon review data
  let amazonReviewContext = ''
  if (amazonReviews.length > 0) {
    amazonReviewContext = `\n**Amazon Review Data:**\n`
    amazonReviewContext += `- Total reviews: ${totalReviewCount || amazonReviews.length}\n`
    if (starRating) {
      amazonReviewContext += `- Average rating: ${starRating} stars\n`
    }
    if (verifiedReviews.length > 0) {
      amazonReviewContext += `- Verified purchases: ${verifiedReviews.length}\n`
    }
    
    if (positiveThemes.length > 0) {
      amazonReviewContext += `\n**Positive Themes (mentioned 5+ times):**\n`
      positiveThemes.forEach(theme => {
        amazonReviewContext += `- ${theme}\n`
      })
    }
    
    if (negativeThemes.length > 0) {
      amazonReviewContext += `\n**Negative Themes (mentioned 5+ times):**\n`
      negativeThemes.forEach(theme => {
        amazonReviewContext += `- ${theme}\n`
      })
    }
    
    if (specificDetails) {
      if (specificDetails.skinTypes && specificDetails.skinTypes.length > 0) {
        amazonReviewContext += `\n**Skin Types Mentioned:** ${specificDetails.skinTypes.join(', ')}\n`
      }
      if (specificDetails.useCases && specificDetails.useCases.length > 0) {
        amazonReviewContext += `**Use Cases:** ${specificDetails.useCases.join(', ')}\n`
      }
      if (specificDetails.timeframes && specificDetails.timeframes.length > 0) {
        amazonReviewContext += `**Timeframes:** ${specificDetails.timeframes.join(', ')}\n`
      }
    }
    
    if (memorableQuotes.length > 0) {
      amazonReviewContext += `\n**Memorable User Quotes:**\n`
      memorableQuotes.forEach((quote, i) => {
        amazonReviewContext += `${i + 1}. "${quote}"\n`
      })
    }
    
    // Add formatted review quotes
    if (quotesMarkdown) {
      amazonReviewContext += `\n**FORMATTED REVIEW QUOTES (USE THESE EXACTLY IN "What Real Users Say" SECTION):**\n${quotesMarkdown}\n`
      amazonReviewContext += `\n**CRITICAL:** These are REAL quotes from Amazon reviews. Use them EXACTLY as formatted above in the "What Real Users Say" section. Keep the authentic voice - minor typo fixes are okay but don't over-clean. Use the exact attribution format shown.\n`
    }
    
    amazonReviewContext += `\n**Sample Reviews:**\n${topReviews}\n`
    amazonReviewContext += `\n**Important:** Use Amazon review data as the PRIMARY source. Extract specific details like "87% of reviewers with sensitive skin mentioned no irritation" or "works on foundation and light mascara, struggles with waterproof". Be specific with percentages, timeframes, and skin types. Reference as "Amazon reviewers" or "verified buyers" - don't imply Reddit discussion if there isn't any.\n`
  }
  
  // Prepare FAQ from real Q&A if available
  let faqContext = ''
  if (product.questions && product.questions.length > 0) {
    faqContext = `\n**Real Customer Questions & Answers (use these for FAQ section):**\n`
    product.questions.slice(0, 10).forEach((qa, i) => {
      faqContext += `${i + 1}. Q: ${qa.question}\n`
      if (qa.answer) {
        faqContext += `   A: ${qa.answer}\n`
      }
    })
    faqContext += `\n**Important:** Use these REAL questions from Amazon Q&A for the FAQ section. These are questions actual buyers asked.\n`
  }

  // Check if we have specific Movers & Shakers data
  const hasMoversShakersData = productContext.includes('Movers & Shakers') || productContext.includes('sales jumped')
  
  // Update hook to include data if available
  const hookData = starRating && totalReviewCount 
    ? `The ${product.name} currently has ${starRating} stars from ${totalReviewCount.toLocaleString()} verified buyers on Amazon`
    : productContext

  // Add editor notes if provided
  let editorNotesContext = ''
  if (editorNotes && editorNotes.trim()) {
    editorNotesContext = `\n**Editor Notes (use as context/inspiration, don't copy directly):**\n${editorNotes}\n\n**Important:** These notes are meant to inform your content generation - use them to understand trends, context, or specific angles. Synthesize these insights naturally into your review, but write in your own voice and style. Don't quote these notes verbatim.\n`
  }

  // Add Google Trends context if available
  let googleTrendsContext = ''
  if (googleTrendsData?.url) {
    googleTrendsContext = `\n**Google Trends Data:**\nA Google Trends URL is available for this product (worldwide view): ${googleTrendsData.url}\n\n**Important:** When writing the "Why It's Trending Right Now" section, if you can infer geographic trends from the URL or context (e.g., "trending strongly in South Korea and the UK", "gaining traction in the US", "popular in Asian markets", "biggest in Europe"), include that naturally. Be specific about regions if the data suggests it. The URL shows worldwide trends, so you can mention if it's trending globally or in specific regions. If you don't have specific geographic data, you can mention it's trending globally or skip geographic mentions.\n`
  }

  const prompt = `You are Alex Chen, a 32-year-old beauty editor who's been testing products professionally for 8 years. You worked at Into The Gloss, now freelance. Write a product review for:

**Product:** ${product.name}
**Brand:** ${product.brand || 'Unknown'}
**Price:** ${priceText}
**Context:** ${productContext}
${amazonReviewContext}${hasRedditData ? redditQuotesText : '\n**Note:** No Reddit data available for this product. Use Amazon review data as the primary source.'}${faqContext}${editorNotesContext}${googleTrendsContext}

**CRITICAL VOICE RULES:**
- Write like you're texting a friend who works at Sephora
- Cut through marketing BS - you've seen every "revolutionary" claim
- Be specific, not vague: "Smoothed texture in 2 weeks" not "amazing results"
- Honest about flaws - nothing is perfect
- Use contractions: "it's", "don't", "you're"
- Ask rhetorical questions: "Worth ${priceText}? Depends on your expectations."
- Use real numbers when possible
- Short paragraphs (2-4 sentences max)
- **CRITICAL: VARY YOUR WRITING STYLE - Each review should feel unique. Avoid repetitive phrases like:**
  * ❌ "I've been getting questions about [product] all week" (overused)
  * ❌ "hitting that sweet spot" (overused)
  * ❌ "makes sense" (overused)
  * ❌ "all week" (overused pattern)
- **VARY YOUR OPENING HOOKS - Use different styles for each product:**
  * Start with a specific observation: "The reviews for ${product.name} are interesting - people either love it or hate it, and there's a pattern."
  * Start with context: "Aluminum-free deodorants are having a moment, and ${product.name} is one of the ones people keep asking about."
  * Start with a question: "Is ${product.name} worth the hype? The data says yes, but the reviews tell a more nuanced story."
  * Start with a trend: "Natural deodorants are trending, and ${product.name} is getting attention for a specific reason."
  * Start with a comparison: "Compared to other products in this category, ${product.name} stands out because..."
  * Start with user behavior: "People are buying ${product.name} in droves right now, and after reading through hundreds of reviews, here's what's actually happening."
  * Start with a specific detail: "The ${product.name} has a 4.3-star rating from 13,000+ reviews, but the 1-star reviews reveal something important."
  * Start with timing: "Right now, ${product.name} is trending because [specific reason based on data]."
- **Vary sentence structure** - Don't always use the same sentence patterns. Mix short and long sentences.
- **Vary paragraph structure** - Some paragraphs can be 1 sentence, others 3-4. Don't make them all the same length.
- No exclamation marks unless genuinely surprising
- NO marketing language: ❌ "game-changing", "revolutionary", "miracle", "transforms"
- NO generic intros: ❌ "In the world of skincare..."
- NO filler words: ❌ "very unique", "really amazing"
- NO repetitive phrases: ❌ "all week", "makes sense", "sweet spot", "getting questions"

**Generate these sections in JSON format:**

{
  "hook": "2-sentence hook for homepage card. Include concrete data if available. ${hasMoversShakersData ? `Example: 'The ${product.name} jumped significantly in Amazon sales and currently has ${starRating || 'X'} stars from ${totalReviewCount ? totalReviewCount.toLocaleString() : 'X'} verified buyers. Here's what's actually happening.'` : `Example: 'The ${product.name} is getting more popular on Amazon and Reddit skincare threads, with ${starRating || 'X'} stars from ${totalReviewCount ? totalReviewCount.toLocaleString() : 'X'} verified buyers. Here's what's actually happening.'`} **IMPORTANT: Only mention 'Movers & Shakers' or specific sales jump percentages if that data is actually provided in the context. If there's no specific sales jump data, be vague and say 'getting more popular on Amazon' or 'trending on Amazon and Reddit' instead.**",
  "whyTrending": "Why it's trending right now (2-3 paragraphs, explain the viral moment with actual data). ${hasRedditData ? 'Include Reddit discussions, upvote counts, post titles if available.' : 'Focus on Amazon review trends and popularity signals.'} **CRITICAL: ${hasMoversShakersData ? 'You can mention specific sales jump percentages or Movers & Shakers if that data is in the context.' : 'DO NOT mention "Movers & Shakers" or specific sales jump percentages unless that exact data is provided. Instead, use vague language like "getting more popular on Amazon", "trending on Amazon and Reddit skincare threads", or "gaining traction".'} **VARY YOUR OPENING - Use a different style for each product. Avoid repetitive phrases like 'I've been getting questions about this all week' or 'hitting that sweet spot'. Instead, try: starting with a specific data point, asking a question, making an observation, or describing the trend context. Each review should feel fresh and unique.**",
  "whatItDoes": "What it actually does in plain language (2 paragraphs, translate marketing speak). If the product has age-specific benefits or considerations (e.g., anti-aging for mature skin, gentle formulas for teens, acne treatments for younger users), naturally mention the age range it's best suited for. For example: 'This is a gentle retinol that works well for people in their 20s-30s who are starting anti-aging' or 'The formula is strong enough for mature skin (40+) but might be too intense for younger users.' Only include age information if it's relevant to how the product works.",
  "theGood": "The Good section - specific positives from real use. MUST use markdown list format with each item on its own line starting with '- ' (dash space). ${hasRedditData ? 'Mix Reddit comments with Amazon review themes.' : 'Based on Amazon reviews, people consistently mention...'} Use specific details like '87% of reviewers with sensitive skin mentioned no irritation' or 'works on foundation and light mascara'. Reference as 'Amazon reviewers' or 'verified buyers'.",
  "theBad": "The Bad section - honest critiques. MUST use markdown list format with each item on its own line starting with '- ' (dash space). ${hasRedditData ? 'Acknowledge flaws - use negative Reddit quotes naturally.' : 'Common complaints from verified buyers include...'} Be specific: 'struggles with waterproof mascara' not just 'doesn't remove makeup'.",
  "whatRealUsersSay": "What Real Users Are Saying section - Use the FORMATTED REVIEW QUOTES provided above EXACTLY. Pull minimum 5 real quotes from Amazon reviews. Use exact text from reviews (minor typo fixes okay). Keep authentic voice, don't clean up too much. Format each quote as:\n\"[exact quote text]\"\n- [attribution]\n\nExample format:\n\"This stuff stings a bit at first but my skin was SO smooth the next day\"\n- Verified buyer, combination skin\n\n\"Better than the Ordinary's AHA peel for my sensitive skin, didn't irritate\"\n- 2-month user\n\n\"Packaging is annoying to open but results are legit for the price\"\n- Verified purchase\n\nUse the formatted quotes provided - they already have proper attribution. Mix positive and negative quotes to show balance.",
  "whoShouldTry": "Who should try it - clear use cases. MUST use markdown list format with each item on its own line starting with '- ' (dash space). 4-5 bullets, be direct and helpful. Use specific details from reviews about skin types and use cases. **Include age range information when relevant** - mention if it's best for teens (13-19), 20s, 30s, 40s, 50+, or if it works across age ranges. For example: '- People in their 20s-30s looking to start anti-aging prevention' or '- Mature skin (40+) dealing with fine lines and texture' or '- Teens and young adults (13-25) with acne-prone skin'. Only include age ranges if reviews mention them or if the product type naturally suggests an age group.",
  "whoShouldSkip": "Who should skip it - clear non-use cases. MUST use markdown list format with each item on its own line starting with '- ' (dash space). 3-4 bullets, be direct. Use specific details from reviews. **Include age range information when relevant** - mention if it's not suitable for certain age groups. For example: '- People under 18 (too strong for young skin)' or '- Teens (formula is too heavy/mature for younger users)' or '- Very young users (under 13, product not tested for this age group)'. Only include age ranges if reviews mention them or if the product type naturally suggests it's not suitable for certain ages.",
  "alternatives": "Alternatives section with 3 options. CRITICAL: Each alternative MUST be on its own line with proper formatting. Use this EXACT format (each on a separate line with double line breaks between them):\n\n**Budget:** Product Name ($price) - explanation of tradeoff and why it's different\n\n**Luxury:** Product Name ($price) - explanation of tradeoff and why it's worth the extra cost\n\n**Different approach:** Product Name ($price) - explanation of why this is a different approach and when it makes sense\n\nIMPORTANT: Format as plain text with product name and price in parentheses. The system will automatically add Amazon links. Each alternative must be on its own line with a blank line between them.",
  "verdict": "The Verdict - Your clear POV in 2-3 sentences. Give a direct answer to 'Is it worth it?' without being preachy. Example: 'Look, this isn't going to replace retinol for actual anti-aging. But for temporary glow and the fun factor? It delivers.'",
  "faq": ${product.questions && product.questions.length > 0 
    ? `Use the real customer questions provided above. Generate 5-7 FAQs based on those questions.`
    : `[
    {"question": "Question 1 from real user concerns", "answer": "Direct answer"},
    {"question": "Question 2", "answer": "Direct answer"},
    {"question": "Question 3", "answer": "Direct answer"},
    {"question": "Question 4", "answer": "Direct answer"},
    {"question": "Question 5", "answer": "Direct answer"}
  ]`}
}

**Example opening styles (for whyTrending) - USE THESE AS INSPIRATION, but create your own unique version each time:**
- Start with data: "${product.name} has ${totalReviewCount ? totalReviewCount.toLocaleString() : 'thousands of'} reviews on Amazon, and ${starRating ? `${starRating} stars` : 'the rating'} tells part of the story. But the real trend is happening because..."
- Start with a question: "Why is ${product.name} trending right now? The answer isn't just marketing - it's actually addressing a specific problem people have."
- Start with context: "Natural deodorants are having a moment, and ${product.name} is one of the products people keep coming back to. Here's why."
- Start with comparison: "Compared to other products in this category, ${product.name} is getting attention for a specific reason: [use actual data from reviews/trends]."
- Start with user behavior: "People are buying ${product.name} right now, and after analyzing the reviews, there's a clear pattern emerging."
- Start with a specific detail: "The ${product.name} has ${starRating ? `${starRating} stars` : 'strong ratings'} from ${totalReviewCount ? totalReviewCount.toLocaleString() : 'thousands of'} reviews, but what's interesting is what the verified buyers are saying."
- Start with timing: "Right now, ${product.name} is trending because [specific reason based on the data provided - Reddit discussions, Amazon sales patterns, review themes, etc.]."

**CRITICAL: Create a unique opening for each product. Don't reuse the same phrases. Avoid: "all week", "makes sense", "sweet spot", "getting questions". Write each review as if it's the first time you're writing about this product.**

Return ONLY valid JSON, no markdown formatting, no code blocks.`

  try {
    // Use model from env or fallback to current 2025 models
    // Available models: claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
    const modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    
    console.log(`Calling Anthropic API with model: ${modelName}`)
    const startTime = Date.now()
    
    // Wrap API call with timeout (45 seconds to leave room for other operations)
    const apiCall = anthropic.messages.create({
      model: modelName,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Anthropic API call timed out after 45 seconds'))
      }, 45000)
    })
    
    const response = await Promise.race([apiCall, timeoutPromise]) as Awaited<typeof apiCall>
    
    const apiTime = Date.now() - startTime
    console.log(`Anthropic API call completed in ${(apiTime / 1000).toFixed(1)}s`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON from response
    let jsonText = content.text.trim()
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '')
    
    const parsed = JSON.parse(jsonText)

    // Validate structure
    if (!parsed.hook || !parsed.whyTrending || !parsed.whatItDoes) {
      throw new Error('Missing required fields in Claude response')
    }

  // Post-process alternatives to add Amazon links if missing (with timeout)
  const alternativesStartTime = Date.now()
  let processedAlternatives = parsed.alternatives || ''
  try {
    // Add timeout for alternatives processing (15 seconds max)
    const alternativesPromise = processAlternativesWithLinks(parsed.alternatives || '')
    const alternativesTimeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Alternatives processing timed out'))
      }, 15000)
    })
    
    processedAlternatives = await Promise.race([alternativesPromise, alternativesTimeoutPromise])
    const alternativesTime = Date.now() - alternativesStartTime
    console.log(`Alternatives processing completed in ${(alternativesTime / 1000).toFixed(1)}s`)
  } catch (error) {
    const alternativesTime = Date.now() - alternativesStartTime
    console.error(`Error processing alternatives with links (took ${(alternativesTime / 1000).toFixed(1)}s):`, error)
    // Use original alternatives text if processing fails
    processedAlternatives = parsed.alternatives || ''
  }
    
    // Combine verdict with alternatives if verdict exists
    const alternativesWithVerdict = parsed.verdict 
      ? `${processedAlternatives}\n\n## The Verdict\n\n${parsed.verdict}`
      : processedAlternatives

    return {
      hook: parsed.hook,
      whyTrending: parsed.whyTrending,
      whatItDoes: parsed.whatItDoes,
      theGood: parsed.theGood || '',
      theBad: parsed.theBad || '',
      whoShouldTry: parsed.whoShouldTry || '',
      whoShouldSkip: parsed.whoShouldSkip || '',
      alternatives: alternativesWithVerdict,
      whatRealUsersSay: parsed.whatRealUsersSay || '',
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    }
  } catch (error) {
    console.error('Error generating content with Claude:', error)
    throw error
  }
}

/**
 * Generate and save content for a product
 */
export async function generateAndSaveContent(productId: string): Promise<void> {
  // Fetch product with all relations
  // Note: metadata and questions might not exist until schema is synced
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      trendSignals: true,
      reviews: {
        take: 50, // Get more reviews for better analysis
        orderBy: [
          { helpful: 'desc' },
          { rating: 'desc' },
        ],
      },
      content: true, // Include content to get editor notes
      // Don't include metadata/questions here - fetch separately
    },
  })
  
  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  // Fetch metadata and questions separately if they exist
  let metadata = null
  let questions: any[] = []
  
  try {
    // @ts-ignore - ProductMetadata might not exist in Prisma client yet
    if (prisma.productMetadata) {
      // @ts-ignore
      metadata = await prisma.productMetadata.findUnique({
        where: { productId: product.id },
      })
    }
  } catch (error) {
    // Metadata table doesn't exist yet
    console.log('ProductMetadata not available - schema may need syncing')
  }
  
  try {
    // @ts-ignore - ProductQuestion might not exist in Prisma client yet
    if (prisma.productQuestion) {
      // @ts-ignore
      questions = await prisma.productQuestion.findMany({
        where: { productId: product.id },
        take: 10,
        orderBy: { helpful: 'desc' },
      })
    }
  } catch (error) {
    // Questions table doesn't exist yet
    console.log('ProductQuestion not available - schema may need syncing')
  }
  
  // Add metadata and questions to product object
  const productWithRelations = {
    ...product,
    metadata,
    questions,
  }

  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  // Fetch existing editor notes and Google Trends data if content exists
  let editorNotes: string | null = null
  let googleTrendsData: any = null
  if (product.content) {
    // @ts-ignore - editorNotes might not be in type yet
    editorNotes = (product.content as any).editorNotes || null
    googleTrendsData = (product.content as any).googleTrendsData || null
  }

  const startTime = Date.now()
  console.log(`[${productId}] Generating content for: ${productWithRelations.name}`)
  if (editorNotes) {
    console.log(`Using editor notes: ${editorNotes.substring(0, 100)}...`)
  }
  if (googleTrendsData?.url) {
    console.log(`Google Trends URL available: ${googleTrendsData.url}`)
    // Note: The URL format should be: https://trends.google.com/trends/explore?q=Product+Name&hl=en-GB (worldwide, no geo parameter)
  }

  // Search Reddit for quotes before generating content (with timeout to prevent hanging)
  const redditStartTime = Date.now()
  console.log(`[${productId}] Searching Reddit for quotes...`)
  let redditQuotes: Array<{ text: string; sentiment: 'positive' | 'negative' | 'neutral'; upvotes: number; subreddit: string }> = []
  try {
    // Extract category from product name
    const categoryKeywords: Record<string, string> = {
      'micellar': 'micellar water',
      'cleanser': 'cleanser',
      'serum': 'serum',
      'moisturizer': 'moisturizer',
      'sunscreen': 'sunscreen',
      'toner': 'toner',
      'mask': 'face mask',
    }
    let category: string | undefined
    const lowerName = product.name.toLowerCase()
    for (const [key, cat] of Object.entries(categoryKeywords)) {
      if (lowerName.includes(key)) {
        category = cat
        break
      }
    }

    // Add timeout for Reddit search (10 seconds max)
    const redditSearchPromise = searchRedditForQuotes(productWithRelations.name, productWithRelations.brand || undefined, category)
    const redditTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Reddit search timed out after 10 seconds'))
      }, 10000)
    })

    const quotes = await Promise.race([redditSearchPromise, redditTimeoutPromise])
    redditQuotes = quotes.map(q => ({
      text: q.text,
      sentiment: q.sentiment,
      upvotes: q.upvotes,
      subreddit: q.subreddit,
    }))
    const redditTime = Date.now() - redditStartTime
    console.log(`[${product.id}] Found ${redditQuotes.length} Reddit quotes (${redditQuotes.filter(q => q.sentiment === 'positive').length} positive, ${redditQuotes.filter(q => q.sentiment === 'negative').length} negative) in ${(redditTime / 1000).toFixed(1)}s`)
  } catch (error) {
    const redditTime = Date.now() - redditStartTime
    console.error(`Error searching Reddit for quotes (took ${(redditTime / 1000).toFixed(1)}s):`, error)
    // Continue without quotes if search fails - Amazon reviews are primary source
    console.log('Continuing with Amazon reviews as primary source')
  }

  // Generate content
  const contentStartTime = Date.now()
  console.log(`[${product.id}] Starting content generation with Claude AI...`)
  const content = await generateProductContent({
    id: productWithRelations.id,
    name: productWithRelations.name,
    brand: productWithRelations.brand,
    price: productWithRelations.price,
    amazonUrl: productWithRelations.amazonUrl,
    trendSignals: productWithRelations.trendSignals,
    reviews: productWithRelations.reviews.map(r => ({
      rating: r.rating,
      content: r.content,
      author: r.author,
      verified: r.verified,
      helpful: r.helpful,
    })),
    metadata: metadata ? {
      starRating: metadata.starRating,
      totalReviewCount: metadata.totalReviewCount,
      positiveThemes: metadata.positiveThemes as string[] | null,
      negativeThemes: metadata.negativeThemes as string[] | null,
      specificDetails: metadata.specificDetails as {
        skinTypes?: string[]
        useCases?: string[]
        timeframes?: string[]
      } | null,
      memorableQuotes: metadata.memorableQuotes as string[] | null,
    } : null,
    questions: questions.map(q => ({
      question: q.question,
      answer: q.answer,
    })),
  }, redditQuotes, editorNotes, googleTrendsData)

  // Generate slug
  const slug = generateSlug(productWithRelations.name)

  // Save to database
  await prisma.productContent.upsert({
    where: { productId: productWithRelations.id },
    update: {
      slug,
      hook: content.hook,
      whyTrending: content.whyTrending,
      whatItDoes: content.whatItDoes,
      theGood: content.theGood,
      theBad: content.theBad,
      whoShouldTry: content.whoShouldTry,
      whoShouldSkip: content.whoShouldSkip,
      alternatives: content.alternatives,
      whatRealUsersSay: content.whatRealUsersSay,
      editorNotes: editorNotes, // Preserve existing editor notes
      // Preserve redditHotness and googleTrendsData if they exist
      redditHotness: product.content?.redditHotness || undefined,
      googleTrendsData: product.content?.googleTrendsData || undefined,
      faq: content.faq as any,
      updatedAt: new Date(),
    },
    create: {
      productId: productWithRelations.id,
      slug,
      hook: content.hook,
      whyTrending: content.whyTrending,
      whatItDoes: content.whatItDoes,
      theGood: content.theGood,
      theBad: content.theBad,
      whoShouldTry: content.whoShouldTry,
      whoShouldSkip: content.whoShouldSkip,
      alternatives: content.alternatives,
      whatRealUsersSay: content.whatRealUsersSay,
      editorNotes: editorNotes, // Preserve existing editor notes
      // Preserve redditHotness and googleTrendsData if they exist
      redditHotness: product.content?.redditHotness || undefined,
      googleTrendsData: product.content?.googleTrendsData || undefined,
      faq: content.faq as any,
    },
  })

  // Update product status to DRAFT (ready for review)
  await prisma.product.update({
    where: { id: productWithRelations.id },
    data: {
      status: 'DRAFT',
    },
  })

  // Note: Cache invalidation happens in the API route that calls this function
  // This allows the route handler to use revalidatePath/revalidateTag

  const totalTime = Date.now() - startTime
  console.log(`✅ Content generated and saved in ${(totalTime / 1000).toFixed(1)}s!`)
  console.log(`   Slug: ${slug}`)
  console.log(`   URL: http://localhost:3000/products/${slug}`)
}

