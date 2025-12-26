/**
 * Search Reddit for product mentions and extract positive/negative quotes
 */

interface RedditPost {
  title: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
  author: string
  permalink: string
  id: string
  subreddit: string
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost
    }>
  }
}

interface RedditComment {
  body: string
  score: number
  author: string
}

interface RedditQuote {
  text: string
  source: 'post' | 'comment'
  sentiment: 'positive' | 'negative' | 'neutral'
  upvotes: number
  subreddit: string
  author: string
  url: string
}

const SUBREDDITS = [
  'SkincareAddiction',
  'MakeupAddiction',
  'AsianBeauty',
  'BeautyGuruChatter',
  '30PlusSkinCare',
]

/**
 * Detect sentiment in text (simple keyword-based)
 */
function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase()
  
  const positiveWords = [
    'love', 'amazing', 'great', 'best', 'wonderful', 'excellent', 'perfect',
    'fantastic', 'awesome', 'incredible', 'game changer', 'holy grail',
    'works great', 'highly recommend', 'worth it', 'so good', 'obsessed',
    'beautiful', 'stunning', 'gorgeous', 'flawless', 'smooth', 'glowing',
    'improved', 'better', 'results', 'effective', 'satisfied', 'happy'
  ]
  
  const negativeWords = [
    'hate', 'terrible', 'awful', 'worst', 'bad', 'disappointed', 'waste',
    'broke out', 'irritated', 'burning', 'stinging', 'dry', 'patchy',
    'doesn\'t work', 'not worth', 'overpriced', 'cheap', 'poor quality',
    'rash', 'allergic', 'sensitive', 'peeling', 'flaking', 'greasy',
    'sticky', 'pilling', 'oxidizing', 'oxidizes', 'does nothing'
  ]
  
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length
  
  if (positiveCount > negativeCount && positiveCount > 0) return 'positive'
  if (negativeCount > positiveCount && negativeCount > 0) return 'negative'
  return 'neutral'
}

/**
 * Extract quotes from Reddit post text
 */
function extractQuotesFromText(text: string, postScore: number, subreddit: string, author: string, url: string): RedditQuote[] {
  const quotes: RedditQuote[] = []
  
  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300) // Reasonable quote length
  
  for (const sentence of sentences) {
    const sentiment = detectSentiment(sentence)
    if (sentiment !== 'neutral') {
      quotes.push({
        text: sentence,
        source: 'post',
        sentiment,
        upvotes: postScore,
        subreddit,
        author,
        url,
      })
    }
  }
  
  return quotes
}

/**
 * Fetch top comments from a Reddit post
 */
async function fetchPostComments(postId: string, subreddit: string): Promise<RedditComment[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=50`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeautyFinder/1.0 (Reddit Quote Search)',
      },
    })

    if (!response.ok) return []

    const data = await response.json()
    const comments: RedditComment[] = []
    
    // Reddit returns [post, comments] - we want comments
    if (Array.isArray(data) && data.length > 1) {
      const commentsData = data[1]?.data?.children || []
      
      for (const child of commentsData.slice(0, 20)) { // Top 20 comments
        const comment = child.data
        if (comment && comment.body && comment.score > 2) {
          comments.push({
            body: comment.body,
            score: comment.score,
            author: comment.author || 'unknown',
          })
        }
      }
    }
    
    return comments
  } catch (error) {
    return []
  }
}

/**
 * Search Reddit with fallback strategy
 */
async function searchRedditWithFallback(
  subreddit: string,
  exactQuery: string,
  brandQuery?: string,
  categoryQuery?: string
): Promise<RedditPost[]> {
  const posts: RedditPost[] = []
  const seenPostIds = new Set<string>()

  // Strategy 1: Exact product name
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(`"${exactQuery}"`)}&restrict_sr=1&sort=top&t=year&limit=25`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'StyleLuxe/1.0 (Reddit Quote Search)' },
    })
    
    if (response.ok) {
      const data: RedditResponse = await response.json()
      for (const child of data.data.children) {
        const post = child.data
        if (post.score > 20 && !seenPostIds.has(post.id)) {
          seenPostIds.add(post.id)
          posts.push(post)
        }
      }
    }
  } catch (error) {
    console.error(`Error in exact search:`, error)
  }

  // Strategy 2: Brand name only (if we have results, skip)
  if (posts.length === 0 && brandQuery) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(`"${brandQuery}"`)}&restrict_sr=1&sort=top&t=year&limit=25`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'StyleLuxe/1.0 (Reddit Quote Search)' },
      })
      
      if (response.ok) {
        const data: RedditResponse = await response.json()
        for (const child of data.data.children) {
          const post = child.data
          // Check if product is mentioned in post
          const postText = `${post.title} ${post.selftext}`.toLowerCase()
          if (postText.includes(exactQuery.toLowerCase()) && post.score > 20 && !seenPostIds.has(post.id)) {
            seenPostIds.add(post.id)
            posts.push(post)
          }
        }
      }
    } catch (error) {
      console.error(`Error in brand search:`, error)
    }
  }

  // Strategy 3: Category search (if still no results)
  if (posts.length === 0 && categoryQuery) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(`"${categoryQuery}"`)}&restrict_sr=1&sort=top&t=year&limit=25`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'StyleLuxe/1.0 (Reddit Quote Search)' },
      })
      
      if (response.ok) {
        const data: RedditResponse = await response.json()
        for (const child of data.data.children) {
          const post = child.data
          const postText = `${post.title} ${post.selftext}`.toLowerCase()
          // Check if product or brand is mentioned
          if ((postText.includes(exactQuery.toLowerCase()) || (brandQuery && postText.includes(brandQuery.toLowerCase()))) 
              && post.score > 20 && !seenPostIds.has(post.id)) {
            seenPostIds.add(post.id)
            posts.push(post)
          }
        }
      }
    } catch (error) {
      console.error(`Error in category search:`, error)
    }
  }

  // Strategy 4: Check megathreads (Holy Grail, Routine Megathread, Favorites)
  if (posts.length === 0) {
    try {
      const megathreadQueries = ['holy grail', 'routine megathread', 'favorites', 'favorite products']
      for (const query of megathreadQueries) {
        const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=year&limit=10`
        const response = await fetch(url, {
          headers: { 'User-Agent': 'StyleLuxe/1.0 (Reddit Quote Search)' },
        })
        
        if (response.ok) {
          const data: RedditResponse = await response.json()
          for (const child of data.data.children) {
            const post = child.data
            const postText = `${post.title} ${post.selftext}`.toLowerCase()
            if ((postText.includes(exactQuery.toLowerCase()) || (brandQuery && postText.includes(brandQuery.toLowerCase()))) 
                && post.score > 50 && !seenPostIds.has(post.id)) {
              seenPostIds.add(post.id)
              posts.push(post)
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit
      }
    } catch (error) {
      console.error(`Error in megathread search:`, error)
    }
  }

  return posts
}

/**
 * Search Reddit for product and extract quotes with fallback strategy
 */
export async function searchRedditForQuotes(productName: string, brand?: string, category?: string): Promise<RedditQuote[]> {
  const allQuotes: RedditQuote[] = []
  
  // Extract category from product name if not provided
  const categoryKeywords: Record<string, string> = {
    'micellar': 'micellar water',
    'cleanser': 'cleanser',
    'serum': 'serum',
    'moisturizer': 'moisturizer',
    'sunscreen': 'sunscreen',
    'toner': 'toner',
    'mask': 'face mask',
  }
  
  let detectedCategory = category
  if (!detectedCategory) {
    const lowerName = productName.toLowerCase()
    for (const [key, cat] of Object.entries(categoryKeywords)) {
      if (lowerName.includes(key)) {
        detectedCategory = cat
        break
      }
    }
  }
  
  for (const subreddit of SUBREDDITS) {
    try {
      // Use fallback search strategy
      const posts = await searchRedditWithFallback(
        subreddit,
        productName,
        brand,
        detectedCategory
      )

      for (const post of posts) {
        const redditUrl = post.permalink 
          ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
          : `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}`
        
        // Extract quotes from post text
        const postText = `${post.title} ${post.selftext}`
        const postQuotes = extractQuotesFromText(
          postText,
          post.score,
          post.subreddit,
          post.author,
          redditUrl
        )
        allQuotes.push(...postQuotes)
        
        // Fetch and extract quotes from top comments
        if (post.num_comments > 5) {
          const comments = await fetchPostComments(post.id, post.subreddit)
          
          for (const comment of comments) {
            const commentQuotes = extractQuotesFromText(
              comment.body,
              comment.score,
              post.subreddit,
              comment.author,
              redditUrl
            )
            allQuotes.push(...commentQuotes.map(q => ({ ...q, source: 'comment' as const })))
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`Error searching ${subreddit}:`, error)
      continue
    }
  }
  
  // Sort by upvotes and return top quotes
  return allQuotes
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 10) // Top 10 quotes
}

