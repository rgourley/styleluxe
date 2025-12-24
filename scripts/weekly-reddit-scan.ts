/**
 * Weekly Reddit Scan
 * 
 * Simple approach:
 * 1. Fetch top 25 posts from each subreddit (past week)
 * 2. Look for posts that are clearly about specific products:
 *    - Title patterns: "Review:", "PSA:", "Holy Grail:", "[Product Name] changed my skin"
 *    - High engagement (>300 upvotes)
 * 3. Extract the SHORT product name people actually use
 * 4. Store these Reddit-mentioned products with their upvote counts and comments
 * 5. Then try to find them on Amazon using the SHORT name
 */

import { prisma } from '../lib/prisma'
import { searchAmazonProduct } from '@/lib/amazon-search'

interface RedditPost {
  title: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
  author: string
  url: string
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

const SUBREDDITS = [
  'SkincareAddiction',
  'MakeupAddiction',
  'AsianBeauty',
  'BeautyGuruChatter',
  '30PlusSkinCare',
]

/**
 * Check if a post matches product-focused patterns
 */
function isProductFocusedPost(post: RedditPost): boolean {
  const titleLower = post.title.toLowerCase()
  const textLower = post.selftext.toLowerCase()
  const combined = `${titleLower} ${textLower}`
  
  // Pattern 1: Review posts
  if (titleLower.includes('review:') || titleLower.startsWith('review')) {
    return true
  }
  
  // Pattern 2: PSA posts
  if (titleLower.includes('psa:') || titleLower.startsWith('psa')) {
    return true
  }
  
  // Pattern 3: Holy Grail posts
  if (titleLower.includes('holy grail') || titleLower.includes('holygrail')) {
    return true
  }
  
  // Pattern 4: "[Product] changed my skin/life" pattern
  if (titleLower.match(/changed my (skin|life|routine|face)/)) {
    return true
  }
  
  // Pattern 5: "Has anyone tried [Product]?"
  if (titleLower.match(/has anyone tried|anyone tried|tried.*\?/)) {
    return true
  }
  
  // Pattern 6: "Thoughts on [Product]?"
  if (titleLower.match(/thoughts on|opinions on|what do you think about/)) {
    return true
  }
  
  return false
}

/**
 * Extract SHORT product name from post title/text
 * People use short names like "Medicube Collagen Mask", "CeraVe SA Cleanser"
 */
function extractShortProductName(post: RedditPost): string | null {
  const title = post.title
  const text = post.selftext
  
  // Remove common prefixes
  const cleanedTitle = title
    .replace(/^(review|psa|holy grail|thoughts on|has anyone tried|opinions on|what do you think about):?\s*/i, '')
    .replace(/\[.*?\]/g, '') // Remove [tags]
    .trim()
  
  // Look for brand + product pattern (usually 2-4 words)
  // Common beauty brands
  const brands = [
    'cerave', 'neutrogena', 'la roche-posay', 'the ordinary', 'paula\'s choice',
    'drunken elephant', 'glossier', 'fenty', 'rare beauty', 'tatcha',
    'fresh', 'kiehl\'s', 'clinique', 'estee lauder', 'lancome',
    'nars', 'mac', 'urban decay', 'too faced', 'anastasia beverly hills',
    'medicube', 'cosrx', 'snail', 'beauty of joseon', 'innisfree',
    'laneige', 'sulwhasoo', 'sk-ii', 'shiseido', 'dior',
    'charlotte tilbury', 'pat mcgrath', 'hourglass', 'it cosmetics',
    'bareminerals', 'tarte', 'benefit', 'stila', 'milk makeup',
  ]
  
  // Try to find brand + product name (2-5 words total)
  const words = cleanedTitle.split(/\s+/).filter(w => w.length > 0)
  
  for (let i = 0; i < words.length; i++) {
    const wordLower = words[i].toLowerCase().replace(/[^\w]/g, '')
    
    // Check if this word matches a brand
    const matchedBrand = brands.find(brand => 
      brand.toLowerCase().includes(wordLower) || wordLower.includes(brand.toLowerCase())
    )
    
    if (matchedBrand) {
      // Take brand + next 1-3 words as product name
      const productWords = words.slice(i, Math.min(i + 4, words.length))
      const productName = productWords.join(' ').trim()
      
      // Clean up: remove question marks, exclamation marks at end
      const cleaned = productName.replace(/[?!]+$/, '').trim()
      
      if (cleaned.length >= 5 && cleaned.length <= 80) {
        return cleaned
      }
    }
  }
  
  // Fallback: If title is short enough and looks like a product name (2-5 words, capitalized)
  if (words.length >= 2 && words.length <= 5) {
    const firstWord = words[0]
    // Check if first word starts with capital (likely brand)
    if (firstWord[0] === firstWord[0].toUpperCase() && firstWord[0] !== firstWord[0].toLowerCase()) {
      const productName = words.join(' ').trim()
      const cleaned = productName.replace(/[?!:]+$/, '').trim()
      
      if (cleaned.length >= 5 && cleaned.length <= 80) {
        return cleaned
      }
    }
  }
  
  // Last resort: Look in text for brand mentions
  const textLower = text.toLowerCase()
  for (const brand of brands) {
    if (textLower.includes(brand)) {
      // Try to extract brand + following words
      const brandIndex = textLower.indexOf(brand)
      const afterBrand = text.substring(brandIndex, brandIndex + 100)
      const afterWords = afterBrand.split(/\s+/).slice(0, 4)
      const productName = afterWords.join(' ').trim()
      
      if (productName.length >= brand.length && productName.length <= 80) {
        return productName
      }
    }
  }
  
  return null
}

/**
 * Fetch top posts from a subreddit (past week)
 */
async function fetchSubredditPosts(subreddit: string): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=25`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StyleLuxe/1.0 (Weekly Reddit Scan)',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${subreddit}: ${response.statusText}`)
      return []
    }

    const data: RedditResponse = await response.json()
    const now = Date.now() / 1000
    const sevenDaysAgo = now - (7 * 24 * 60 * 60)
    
    return data.data.children
      .map((child) => child.data)
      .filter((post) => post.created_utc >= sevenDaysAgo)
  } catch (error) {
    console.error(`Error fetching ${subreddit}:`, error)
    return []
  }
}

/**
 * Calculate Reddit score based on engagement
 * - Post with >300 upvotes = 25 points
 * - Max 2 posts = 50 points max
 */
function calculateRedditScore(posts: RedditPost[]): number {
  const sortedPosts = [...posts].sort((a, b) => b.score - a.score)
  let score = 0
  let postsCounted = 0
  
  for (const post of sortedPosts) {
    if (postsCounted >= 2) break
    
    if (post.score > 300) {
      score += 25
      postsCounted++
    } else if (post.score >= 200 && postsCounted < 2) {
      // Partial credit for 200-300 upvotes
      score += 15
      postsCounted++
    }
  }
  
  return Math.min(50, score)
}

/**
 * Main weekly Reddit scan function
 */
export async function weeklyRedditScan() {
  console.log('='.repeat(60))
  console.log('Weekly Reddit Scan')
  console.log('='.repeat(60))
  console.log()
  
  const allPosts: RedditPost[] = []
  
  // Fetch posts from all subreddits
  for (const subreddit of SUBREDDITS) {
    console.log(`Fetching from r/${subreddit}...`)
    const posts = await fetchSubredditPosts(subreddit)
    allPosts.push(...posts)
    console.log(`  Found ${posts.length} posts from past week`)
  }
  
  console.log(`\nTotal posts: ${allPosts.length}`)
  
  // Filter for product-focused posts with high engagement
  const productPosts = allPosts.filter(post => 
    isProductFocusedPost(post) && post.score > 300
  )
  
  console.log(`Product-focused posts (>300 upvotes): ${productPosts.length}\n`)
  
  // Extract product names and group by product
  const productMentions = new Map<string, RedditPost[]>()
  
  for (const post of productPosts) {
    const productName = extractShortProductName(post)
    
    if (!productName) {
      continue
    }
    
    // Normalize product name (lowercase for grouping)
    const normalized = productName.toLowerCase().trim()
    
    if (!productMentions.has(normalized)) {
      productMentions.set(normalized, [])
    }
    
    productMentions.get(normalized)!.push(post)
  }
  
  console.log(`Found ${productMentions.size} unique products mentioned\n`)
  
  // Process each product
  let stored = 0
  let updated = 0
  let foundOnAmazon = 0
  
  for (const [normalizedName, posts] of productMentions.entries()) {
    // Use the first post's extracted name as the canonical name
    const productName = extractShortProductName(posts[0])!
    
    console.log(`Processing: "${productName}"`)
    console.log(`  Posts: ${posts.length}, Top upvotes: ${Math.max(...posts.map(p => p.score))}`)
    
    // Calculate Reddit score
    const redditScore = calculateRedditScore(posts)
    console.log(`  Reddit score: ${redditScore} points`)
    
    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { name: { contains: productName, mode: 'insensitive' } },
          { name: { contains: normalizedName.split(' ')[0], mode: 'insensitive' } },
        ],
      },
      include: {
        trendSignals: true,
      },
    })
    
    if (existing) {
      // Check if this product already has Reddit signals from these posts
      const existingRedditSignals = existing.trendSignals.filter(
        s => s.source === 'reddit_skincare'
      )
      const existingPostIds = new Set(
        existingRedditSignals.map(s => (s.metadata as any)?.postId)
      )
      
      // Add new Reddit signals for posts we haven't seen
      let newSignalsAdded = 0
      for (const post of posts) {
        if (!existingPostIds.has(post.id)) {
          const redditUrl = post.permalink 
            ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
            : `https://www.reddit.com${post.url}`
          
          await prisma.trendSignal.create({
            data: {
              productId: existing.id,
              source: 'reddit_skincare',
              signalType: 'reddit_mentions',
              value: post.score,
              metadata: {
                postId: post.id,
                subreddit: post.subreddit,
                postTitle: post.title,
                score: post.score,
                comments: post.num_comments,
                url: redditUrl,
                permalink: redditUrl,
                created: new Date(post.created_utc * 1000).toISOString(),
                excerpt: post.selftext.substring(0, 200),
              },
            },
          })
          newSignalsAdded++
        }
      }
      
      if (newSignalsAdded > 0) {
        // Recalculate total score
        const allSignals = await prisma.trendSignal.findMany({
          where: { productId: existing.id },
        })
        
        let amazonScore = 0
        for (const signal of allSignals) {
          if (signal.source === 'amazon_movers') {
            const metadata = signal.metadata as any
            const salesJump = signal.value || metadata?.salesJumpPercent || 0
            if (salesJump > 0) {
              amazonScore = Math.min(70, Math.floor(salesJump / 20))
            } else {
              amazonScore = 10
            }
            break
          }
        }
        
        const redditSignalsForScore = allSignals
          .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 2)
        const newRedditScore = Math.min(30, redditSignalsForScore.length * 15)
        const totalScore = amazonScore + newRedditScore
        
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            trendScore: Math.max(existing.trendScore, totalScore),
            status: totalScore >= 60 ? 'FLAGGED' : existing.status,
          },
        })
        
        console.log(`  ✓ Updated existing product (${newSignalsAdded} new signals, Score: ${totalScore})`)
        updated++
      } else {
        console.log(`  - Already has these Reddit signals`)
      }
    } else {
      // New product - search Amazon first
      console.log(`  Searching Amazon for: "${productName}"`)
      const amazonResult = await searchAmazonProduct(productName)
      
      if (amazonResult) {
        console.log(`  ✓ Found on Amazon: "${amazonResult.name}"`)
        foundOnAmazon++
        
        // Create product with Amazon data
        const product = await prisma.product.create({
          data: {
            name: amazonResult.name || productName,
            brand: amazonResult.brand || productName.split(' ')[0],
            price: amazonResult.price,
            imageUrl: amazonResult.imageUrl,
            amazonUrl: amazonResult.amazonUrl,
            trendScore: redditScore, // Start with Reddit score
            status: redditScore >= 20 ? 'DRAFT' : 'DRAFT',
          },
        })
        
        // Add Reddit signals
        for (const post of posts.slice(0, 2)) { // Store top 2 posts
          const redditUrl = post.permalink 
            ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
            : `https://www.reddit.com${post.url}`
          
          await prisma.trendSignal.create({
            data: {
              productId: product.id,
              source: 'reddit_skincare',
              signalType: 'reddit_mentions',
              value: post.score,
              metadata: {
                postId: post.id,
                subreddit: post.subreddit,
                postTitle: post.title,
                score: post.score,
                comments: post.num_comments,
                url: redditUrl,
                permalink: redditUrl,
                created: new Date(post.created_utc * 1000).toISOString(),
                excerpt: post.selftext.substring(0, 200),
              },
            },
          })
        }
        
        console.log(`  ✅ Created product (Score: ${redditScore})`)
        stored++
      } else {
        console.log(`  ❌ Not found on Amazon - storing as Reddit-only product`)
        
        // Create Reddit-only product
        const product = await prisma.product.create({
          data: {
            name: productName,
            brand: productName.split(' ')[0],
            trendScore: redditScore,
            status: 'DRAFT',
          },
        })
        
        // Add Reddit signals
        for (const post of posts.slice(0, 2)) {
          const redditUrl = post.permalink 
            ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
            : `https://www.reddit.com${post.url}`
          
          await prisma.trendSignal.create({
            data: {
              productId: product.id,
              source: 'reddit_skincare',
              signalType: 'reddit_mentions',
              value: post.score,
              metadata: {
                postId: post.id,
                subreddit: post.subreddit,
                postTitle: post.title,
                score: post.score,
                comments: post.num_comments,
                url: redditUrl,
                permalink: redditUrl,
                created: new Date(post.created_utc * 1000).toISOString(),
                excerpt: post.selftext.substring(0, 200),
              },
            },
          })
        }
        
        console.log(`  ✅ Created Reddit-only product (Score: ${redditScore})`)
        stored++
      }
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log()
  }
  
  console.log('='.repeat(60))
  console.log('✅ Weekly Reddit Scan Complete!')
  console.log(`   - Stored: ${stored} new products`)
  console.log(`   - Updated: ${updated} existing products`)
  console.log(`   - Found on Amazon: ${foundOnAmazon}`)
  console.log('='.repeat(60))
}

// Run if called directly
if (require.main === module) {
  weeklyRedditScan()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}





