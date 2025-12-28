/**
 * Scrape a specific Reddit thread to extract product mentions
 * 
 * Takes a Reddit thread URL and extracts:
 * - Product mentions from title, post text, and comments
 * - Amazon links if present
 * - Context around product mentions
 */

interface RedditComment {
  body: string
  author: string
  score: number
  created_utc: number
  replies?: RedditComment[]
}

interface RedditThreadData {
  title: string
  selftext: string
  author: string
  score: number
  num_comments: number
  subreddit: string
  url: string
  comments: RedditComment[]
}

interface ProductMention {
  productName: string
  context: string
  source: 'title' | 'post' | 'comment'
  author?: string
  score?: number
  amazonUrl?: string
  mentionCount?: number // Number of times this product was mentioned
}

/**
 * Extract Reddit thread ID and subreddit from URL
 * Supports formats:
 * - https://www.reddit.com/r/30PlusSkinCare/comments/1pv9key/help_what_is_everyones_absolute_holy_grail/
 * - https://reddit.com/r/subreddit/comments/thread_id/title/
 */
function parseRedditUrl(url: string): { subreddit: string; threadId: string } | null {
  try {
    const match = url.match(/reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/)
    if (match) {
      return {
        subreddit: match[1],
        threadId: match[2],
      }
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Recursively extract all comments from Reddit's nested structure
 */
function extractComments(children: any[]): RedditComment[] {
  const comments: RedditComment[] = []
  
  for (const child of children) {
    if (child.kind === 't1' && child.data) {
      const comment: RedditComment = {
        body: child.data.body || '',
        author: child.data.author || '',
        score: child.data.score || 0,
        created_utc: child.data.created_utc || 0,
      }
      
      // Recursively extract replies
      if (child.data.replies && child.data.replies.data && child.data.replies.data.children) {
        comment.replies = extractComments(child.data.replies.data.children)
      }
      
      comments.push(comment)
    }
  }
  
  return comments
}

/**
 * Fetch Reddit thread data
 */
async function fetchRedditThread(subreddit: string, threadId: string): Promise<RedditThreadData | null> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${threadId}.json?limit=500`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeautyFinder/1.0 (Data Collection Bot)',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch Reddit thread: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Reddit returns [post, comments]
    const postData = data[0]?.data?.children[0]?.data
    const commentsData = data[1]?.data?.children || []
    
    if (!postData) {
      console.error('No post data found in Reddit response')
      return null
    }

    return {
      title: postData.title || '',
      selftext: postData.selftext || '',
      author: postData.author || '',
      score: postData.score || 0,
      num_comments: postData.num_comments || 0,
      subreddit: postData.subreddit || subreddit,
      url: `https://www.reddit.com${postData.permalink || ''}`,
      comments: extractComments(commentsData),
    }
  } catch (error) {
    console.error('Error fetching Reddit thread:', error)
    return null
  }
}

/**
 * Extract product names from text
 * Uses common beauty brand patterns and product name indicators
 */
function extractProductNames(text: string): string[] {
  const products: string[] = []
  const lowerText = text.toLowerCase()
  
  // Common beauty brands (expanded list) - used for validation
  const brands = [
    'cerave', 'cera ve', 'neutrogena', 'la roche-posay', 'the ordinary', 'paula\'s choice', 'paulas choice',
    'drunken elephant', 'drunk elephant', 'glossier', 'fenty', 'rare beauty', 'tatcha',
    'fresh', 'kiehl\'s', 'clinique', 'estee lauder', 'estée lauder', 'lancome', 'lancôme',
    'nars', 'mac', 'urban decay', 'too faced', 'anastasia beverly hills', 'anastasia',
    'laneige', 'cosrx', 'innisfree', 'klairs', 'beauty of joseon', 'sunday riley',
    'dr. jart', 'dr jart', 'dior', 'chanel', 'skinceuticals', 'skin ceuticals',
    'olay', 'l\'oreal', 'loreal', 'maybelline', 'revlon', 'covergirl',
    'elf', 'nyx', 'morphe', 'colourpop', 'milk makeup', 'milk',
    'biossance', 'youth to the people', 'yttp', 'first aid beauty',
    'avène', 'avene', 'eucerin', 'naturium', 'medik8', 'geek & gorgeous', 'geek and gorgeous',
    'farmacy', 'skyn iceland', 'vaseline', 'le mercerie', 'dollar tree',
    'haruharu wonder', 'haruharu', 'allies of skin', 'strivectin',
    'stratia', 'elta md', 'elta',
  ]
  
  // Product type words - used for validation
  const productTypes = [
    'serum', 'cream', 'moisturizer', 'moisturiser', 'sunscreen', 'spf', 'retinal', 'retinol',
    'vitamin', 'peptide', 'hand cream', 'defense', 'ointment', 'mask', 'patches',
    'lip conditioner', 'hydrogel', 'handcream', 'toner', 'tightening cream', 'cleanser',
    'lotion', 'essence', 'ampoule', 'gel', 'balm', 'oil', 'mist', 'spray', 'foam', 'scrub',
    'exfoliant', 'treatment', 'concentrate', 'booster', 'emulsion', 'lotion', 'essence'
  ]
  
  // Common sentence starters and phrases to exclude
  const excludePatterns = [
    /^(i|i\'m|i\'ve|i\'d|my|the|this|that|when|what|where|why|how|you|we|they|it|if|and|or|but|so|for|with|from|about|into|onto|upon|during|through|throughout|under|over|above|below|between|among|within|without|before|after|since|until|while|as|because|although|though|even|though|however|therefore|moreover|furthermore|nevertheless|nonetheless|meanwhile|otherwise|instead|likewise|similarly|consequently|accordingly|hence|thus|indeed|certainly|probably|possibly|maybe|perhaps|usually|often|always|never|sometimes|rarely|seldom|frequently|occasionally|generally|specifically|particularly|especially|mainly|mostly|primarily|essentially|basically|actually|really|very|quite|rather|pretty|fairly|somewhat|rather|too|enough|also|too|either|neither|both|all|each|every|any|some|no|none|many|much|more|most|less|least|few|fewer|several|various|different|same|similar|other|another|such|own|same|different|new|old|young|good|bad|better|best|worse|worst|great|small|large|big|little|long|short|high|low|early|late|first|last|next|previous|recent|current|past|future|present|modern|ancient|old|new|young|fresh|stale|clean|dirty|full|empty|complete|incomplete|finished|unfinished|done|undone|ready|not|ready|able|unable|possible|impossible|likely|unlikely|certain|uncertain|sure|unsure|clear|unclear|obvious|not|obvious|easy|hard|difficult|simple|complex|complicated|straightforward|confusing|confused|understandable|unintelligible|readable|unreadable|legible|illegible|visible|invisible|apparent|not|apparent|evident|not|evident|plain|not|plain|clear|unclear|obvious|not|obvious|easy|hard|difficult|simple|complex|complicated|straightforward|confusing|confused|understandable|unintelligible|readable|unreadable|legible|illegible|visible|invisible|apparent|not|apparent|evident|not|evident|plain|not|plain)$/i,
    /^(redness|texture|budget|routine|simple|cleanser|serum|moisturiser|sunscreen|happy|invest|work|long|term|product|beauty|treatment|procedure|felt|truly|helped|even|multiple|current|certainly)$/i,
    /^(would|love|hear|every|suggestions|wondering|anyone|expected|process|losing|weight|lost|issues|pigmentation|dark|under|eyes|dry|patches|mostly|also|years|daily|couple|wear|have|for|and|have|issues|with|pigmentation|dark|under|eyes|redness|and|texture|dry|patches|mostly|also|in|the|process|of|losing|weight|lost|which|is|to|be|expected|but|wondering|if|anyone|has|any|suggestions|for|that|too|don\'t|have|much|of|a|budget|happy|to|invest|if|it\'ll|work|for|me|long|term|any|and|every|product|or|beauty|treatment|procedure|that|you|have|felt|has|truly|helped|you|and|why|would|love|to|hear|it|even|if|its|multiple|current|routine|is|a|simple|one|cleanser|serum|moisturiser|and|sunscreen|but|certainly|happy|to)$/i,
  ]
  
  // Helper function to check if a string looks like a product name
  function isValidProductName(name: string): boolean {
    const lower = name.toLowerCase()
    const words = name.split(/\s+/).filter(w => w.length > 0)
    
    // Must have at least 2 words
    if (words.length < 2) return false
    
    // Must be between 5 and 150 characters
    if (name.length < 5 || name.length > 150) return false
    
    // Must start with a capital letter (product names typically do)
    if (!/^[A-Z]/.test(name)) return false
    
    // Exclude common sentence starters and phrases
    for (const pattern of excludePatterns) {
      if (pattern.test(lower)) return false
    }
    
    // Must either:
    // 1. Start with a known brand, OR
    // 2. Contain a product type word, OR
    // 3. Look like "Brand Product Name" format (at least 2 capitalized words)
    const startsWithBrand = brands.some(brand => lower.startsWith(brand))
    const containsProductType = productTypes.some(type => lower.includes(type))
    const hasMultipleCapitals = words.filter(w => /^[A-Z]/.test(w)).length >= 2
    
    if (!startsWithBrand && !containsProductType && !hasMultipleCapitals) {
      return false
    }
    
    // Exclude if it's just generic words
    const genericWords = ['current', 'routine', 'simple', 'one', 'cleanser', 'serum', 'moisturiser', 'sunscreen', 'happy', 'invest', 'work', 'long', 'term', 'product', 'beauty', 'treatment', 'procedure', 'felt', 'truly', 'helped', 'even', 'multiple', 'certainly', 'would', 'love', 'hear', 'every', 'suggestions', 'wondering', 'anyone', 'expected', 'process', 'losing', 'weight', 'lost', 'issues', 'pigmentation', 'dark', 'under', 'eyes', 'dry', 'patches', 'mostly', 'also', 'years', 'daily', 'couple', 'wear', 'have', 'for', 'and', 'with', 'redness', 'texture', 'budget', 'don\'t', 'much', 'of', 'a', 'if', 'it\'ll', 'me', 'or', 'that', 'you', 'why', 'it', 'its', 'but']
    if (words.every(w => genericWords.includes(w.toLowerCase()))) {
      return false
    }
    
    return true
  }
  
  // Pattern 1: Brand + Product Name (most reliable)
  for (const brand of brands) {
    const brandEscaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const brandRegex = new RegExp(`\\b${brandEscaped}\\b`, 'gi')
    
    const brandMatches = [...text.matchAll(brandRegex)]
    
    for (const brandMatch of brandMatches) {
      const brandIndex = brandMatch.index!
      const brandEndIndex = brandIndex + brandMatch[0].length
      const afterBrand = text.substring(brandEndIndex, Math.min(brandEndIndex + 200, text.length))
      
      // First, try to match full product name including product type
      // e.g., "Geek & Gorgeous A-Game Retinal"
      const fullWithTypeMatch = afterBrand.match(new RegExp(`\\s+([A-Z][a-zA-Z0-9\\s-&/pH]{3,80})\\s+(${productTypes.join('|')})`, 'i'))
      if (fullWithTypeMatch && fullWithTypeMatch[1] && fullWithTypeMatch[2]) {
        const productName = `${brand} ${fullWithTypeMatch[1].trim()} ${fullWithTypeMatch[2].trim()}`
        if (isValidProductName(productName)) {
          products.push(productName)
          continue // Skip other patterns for this brand match
        }
      }
      
      // If no product type found, look for Brand + Product Name (up to 120 chars after brand)
      const fullProductMatch = afterBrand.match(/\s+([A-Z][a-zA-Z0-9\s-&/pH]{3,120})/i)
      
      if (fullProductMatch && fullProductMatch[1]) {
        let productName = `${brand} ${fullProductMatch[1].trim()}`
        
        // Stop at dash, comma, period, or description markers
        productName = productName
          .replace(/\s*[-–—]\s*[a-z].*$/i, '')
          .replace(/,\s*[a-z].*$/i, '')
          .replace(/\.\s*[a-z].*$/i, '')
          .replace(/[.,;:!?]\s*$/, '')
          .trim()
        
        if (isValidProductName(productName)) {
          products.push(productName)
        }
      }
    }
  }
  
  // Pattern 1.5: Phrases like "I'd like to try [Product Name]" or "next I'd like to try [Product Name]"
  // Also catch "I've tried X and Y, and next I'd like to try Z"
  const tryPhrasePattern = /(?:i\'d like to try|next i\'d like to try|want to try|going to try|planning to try|thinking of trying|and next i\'d like to try)\s+([A-Z][a-zA-Z0-9\s-&/pH]{5,120})/gi
  const tryMatches = [...text.matchAll(tryPhrasePattern)]
  for (const match of tryMatches) {
    if (match[1]) {
      let productName = match[1].trim()
      
      // Try to extend to include product type if it's nearby
      const matchIndex = match.index! + match[0].length
      const afterMatch = text.substring(matchIndex, Math.min(matchIndex + 50, text.length))
      const typeMatch = afterMatch.match(new RegExp(`\\s+(${productTypes.join('|')})`, 'i'))
      if (typeMatch && typeMatch[1]) {
        productName = `${productName} ${typeMatch[1].trim()}`
      }
      
      // Stop at period, comma, or lowercase word (description)
      productName = productName
        .replace(/[.,;:!?]\s*$/, '')
        .replace(/\s+[a-z].*$/i, '') // Stop at lowercase word
        .trim()
      
      // Check if it contains a brand or product type
      const lower = productName.toLowerCase()
      const hasBrand = brands.some(b => lower.includes(b))
      const hasProductType = productTypes.some(t => lower.includes(t))
      
      if ((hasBrand || hasProductType) && isValidProductName(productName)) {
        products.push(productName)
      }
    }
  }
  
  // Pattern 2: Product names with product type endings (e.g., "Brand Name Serum")
  // Include the product type in the result
  const productTypePattern = new RegExp(`([A-Z][a-zA-Z0-9\\s-&/pH]{3,80})\\s+(${productTypes.join('|')})`, 'gi')
  const typeMatches = [...text.matchAll(productTypePattern)]
  for (const match of typeMatches) {
    if (match[1] && match[2]) {
      const productName = `${match[1].trim()} ${match[2].trim()}`
      const cleaned = productName.replace(/\s+(?:which|that|when|where|for|with|and|or|since|they\'ve|it|this|that)\s+[a-z].*$/i, '').trim()
      if (isValidProductName(cleaned)) {
        products.push(cleaned)
      }
    }
  }
  
  // Pattern 3: Product names followed by dashes (e.g., "Brand Product Name - description")
  // Only if it contains a brand or product type
  const dashPattern = /([A-Z][a-zA-Z0-9\s-&/pH]{5,100})\s*[-–—]\s+[a-z]/gi
  const dashMatches = [...text.matchAll(dashPattern)]
  for (const match of dashMatches) {
    const productName = match[1].trim()
    const cleaned = productName.replace(/[.,;:!?]\s*$/, '').trim()
    if (isValidProductName(cleaned)) {
      products.push(cleaned)
    }
  }
  
  // Pattern 4: Product names followed by commas (e.g., "Brand Product Name, I've repurchased")
  // Only if it contains a brand or product type
  const commaPattern = /([A-Z][a-zA-Z0-9\s-&/pH]{5,100}),\s+(?:i\'ve|i\'m|it\'s|they|it|this|that|very|extremely|really|so|new|my|the|i|i\'ve|i\'m|i\'d)/gi
  const commaMatches = [...text.matchAll(commaPattern)]
  for (const match of commaMatches) {
    const productName = match[1].trim()
    if (isValidProductName(productName)) {
      products.push(productName)
    }
  }
  
  // Pattern 5: Products mentioned with "by" (e.g., "ones by Farmacy")
  const byPattern = /(?:ones?|version|product|mask|patches|cream|serum|conditioner|toner|cleanser)\s+by\s+([A-Z][a-zA-Z0-9\s-&/]{2,50})/gi
  const byMatches = [...text.matchAll(byPattern)]
  for (const match of byMatches) {
    const brandName = match[1].trim()
    if (brands.some(b => brandName.toLowerCase().includes(b.toLowerCase()))) {
      const beforeBy = text.substring(Math.max(0, match.index! - 100), match.index!)
      const productMatch = beforeBy.match(/([A-Z][a-zA-Z0-9\s-&/pH]{3,60})\s+by\s*$/i)
      if (productMatch && isValidProductName(productMatch[1].trim())) {
        products.push(`${productMatch[1].trim()} by ${brandName}`)
      }
    }
  }
  

  // Look for Amazon links
  const amazonRegex = /(https?:\/\/(?:www\.)?(?:amazon\.com|amzn\.to)\/[^\s\)]+)/gi
  const amazonLinks = text.match(amazonRegex)
  if (amazonLinks) {
    for (const link of amazonLinks) {
      // Extract ASIN from URL
      const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/)
      if (asinMatch) {
        products.push(`Amazon Product ${asinMatch[1] || asinMatch[2]}`)
      }
    }
  }

  // Note: General patterns (dash, comma, product types, phrases) are already extracted above
  // The brand-based extraction below supplements these general patterns

  // Remove duplicates and normalize
  // Additional filtering to ensure quality
  const filtered = products
    .map(p => p.trim())
    .filter(p => {
      // Already validated by isValidProductName, but double-check
      if (p.length < 5 || p.length > 150) return false
      if (!/[a-zA-Z]/.test(p)) return false
      
      const lower = p.toLowerCase()
      const words = p.split(/\s+/).filter(w => w.length > 0)
      
      // Must have at least 2 words
      if (words.length < 2) return false
      
      // Exclude if all words are generic/common
      const genericWords = ['current', 'routine', 'simple', 'one', 'happy', 'invest', 'work', 'long', 'term', 'would', 'love', 'hear', 'every', 'suggestions', 'wondering', 'anyone', 'expected', 'process', 'losing', 'weight', 'lost', 'issues', 'pigmentation', 'dark', 'under', 'eyes', 'dry', 'patches', 'mostly', 'also', 'years', 'daily', 'couple', 'wear', 'have', 'for', 'and', 'with', 'redness', 'texture', 'budget', 'don\'t', 'much', 'of', 'a', 'if', 'it\'ll', 'me', 'or', 'that', 'you', 'why', 'it', 'its', 'but', 'certainly', 'truly', 'helped', 'even', 'multiple', 'felt', 'procedure', 'treatment', 'beauty', 'product']
      if (words.every(w => genericWords.includes(w.toLowerCase()))) {
        return false
      }
      
      return true
    })
  
  return [...new Set(filtered)]
}

/**
 * Extract product mentions from Reddit thread
 */
export async function scrapeRedditThread(redditUrl: string): Promise<{
  thread: RedditThreadData | null
  productMentions: ProductMention[]
}> {
  const parsed = parseRedditUrl(redditUrl)
  if (!parsed) {
    return { thread: null, productMentions: [] }
  }

  const thread = await fetchRedditThread(parsed.subreddit, parsed.threadId)
  if (!thread) {
    return { thread: null, productMentions: [] }
  }

  const productMentions: ProductMention[] = []
  const seenProducts = new Map<string, number>() // Track product name -> mention count

  // Extract from title
  const titleProducts = extractProductNames(thread.title)
  for (const product of titleProducts) {
    const productKey = product.toLowerCase()
    const currentCount = seenProducts.get(productKey) || 0
    seenProducts.set(productKey, currentCount + 1)
    
    if (currentCount === 0) {
      // First time seeing this product, add it
      productMentions.push({
        productName: product,
        context: thread.title,
        source: 'title',
        score: thread.score,
        mentionCount: 1,
      })
    } else {
      // Update mention count for existing product
      const existing = productMentions.find(p => p.productName.toLowerCase() === productKey)
      if (existing) {
        existing.mentionCount = (existing.mentionCount || 1) + 1
      }
    }
  }

  // Extract from post text
  const postProducts = extractProductNames(thread.selftext)
  for (const product of postProducts) {
    const productKey = product.toLowerCase()
    const currentCount = seenProducts.get(productKey) || 0
    seenProducts.set(productKey, currentCount + 1)
    
    if (currentCount === 0) {
      // First time seeing this product, add it
      // Get context around product mention
      const productIndex = thread.selftext.toLowerCase().indexOf(product.toLowerCase())
      const contextStart = Math.max(0, productIndex - 100)
      const contextEnd = Math.min(thread.selftext.length, productIndex + product.length + 200)
      const context = thread.selftext.substring(contextStart, contextEnd)
      
      productMentions.push({
        productName: product,
        context: context.trim(),
        source: 'post',
        author: thread.author,
        score: thread.score,
        mentionCount: 1,
      })
    } else {
      // Update mention count for existing product
      const existing = productMentions.find(p => p.productName.toLowerCase() === productKey)
      if (existing) {
        existing.mentionCount = (existing.mentionCount || 1) + 1
      }
    }
  }

  // Extract Amazon links from post
  const amazonRegex = /(https?:\/\/(?:www\.)?(?:amazon\.com|amzn\.to)\/[^\s\)]+)/gi
  const postAmazonLinks = thread.selftext.match(amazonRegex)
  if (postAmazonLinks) {
    for (const link of postAmazonLinks) {
      const productName = `Amazon Product from ${thread.author}`
      const productKey = productName.toLowerCase()
      const currentCount = seenProducts.get(productKey) || 0
      seenProducts.set(productKey, currentCount + 1)
      
      if (currentCount === 0) {
        productMentions.push({
          productName,
          context: thread.selftext.substring(0, 200),
          source: 'post',
          author: thread.author,
          score: thread.score,
          amazonUrl: link,
          mentionCount: 1,
        })
      } else {
        const existing = productMentions.find(p => p.productName.toLowerCase() === productKey)
        if (existing) {
          existing.mentionCount = (existing.mentionCount || 1) + 1
        }
      }
    }
  }

  // Extract from comments (top-level and nested)
  const processComment = (comment: RedditComment, depth: number = 0) => {
    if (depth > 3) return // Limit recursion depth
    
    const commentProducts = extractProductNames(comment.body)
    for (const product of commentProducts) {
      const productKey = product.toLowerCase()
      const currentCount = seenProducts.get(productKey) || 0
      seenProducts.set(productKey, currentCount + 1)
      
      if (currentCount === 0) {
        // First time seeing this product, add it
        // Get context around product mention
        const productIndex = comment.body.toLowerCase().indexOf(product.toLowerCase())
        const contextStart = Math.max(0, productIndex - 100)
        const contextEnd = Math.min(comment.body.length, productIndex + product.length + 200)
        const context = comment.body.substring(contextStart, contextEnd)
        
        productMentions.push({
          productName: product,
          context: context.trim(),
          source: 'comment',
          author: comment.author,
          score: comment.score,
          mentionCount: 1,
        })
      } else {
        // Update mention count for existing product
        const existing = productMentions.find(p => p.productName.toLowerCase() === productKey)
        if (existing) {
          existing.mentionCount = (existing.mentionCount || 1) + 1
        }
      }
    }

    // Extract Amazon links from comment
    const commentAmazonLinks = comment.body.match(amazonRegex)
    if (commentAmazonLinks) {
      for (const link of commentAmazonLinks) {
        const productName = `Amazon Product from ${comment.author}`
        const productKey = productName.toLowerCase()
        const currentCount = seenProducts.get(productKey) || 0
        seenProducts.set(productKey, currentCount + 1)
        
        if (currentCount === 0) {
          productMentions.push({
            productName,
            context: comment.body.substring(0, 200),
            source: 'comment',
            author: comment.author,
            score: comment.score,
            amazonUrl: link,
            mentionCount: 1,
          })
        } else {
          const existing = productMentions.find(p => p.productName.toLowerCase() === productKey)
          if (existing) {
            existing.mentionCount = (existing.mentionCount || 1) + 1
          }
        }
      }
    }

    // Process replies recursively
    if (comment.replies) {
      for (const reply of comment.replies) {
        processComment(reply, depth + 1)
      }
    }
  }

  // Process all comments
  for (const comment of thread.comments) {
    processComment(comment)
  }

  return {
    thread,
    productMentions,
  }
}

