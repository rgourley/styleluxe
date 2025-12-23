/**
 * Reddit Enrichment Script
 * 
 * Phase 2: For each Amazon product, search Reddit for mentions
 * This adds Reddit context and discussions to Amazon-discovered products
 */

import { prisma } from '../lib/prisma'

interface RedditSearchResult {
  title: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
  author: string
  url: string // Can be image/external link
  permalink: string // Always points to Reddit discussion page
  id: string
  subreddit: string
}

interface RedditSearchResponse {
  data: {
    children: Array<{
      data: RedditSearchResult
    }>
  }
}

const SUBREDDITS = [
  'SkincareAddiction',
  'MakeupAddiction',
  'AsianBeauty',
]

/**
 * Generate multiple search query variations for a product
 * Tries different combinations to find Reddit mentions
 */
function generateSearchQueries(productName: string, brand?: string): string[] {
  const queries: string[] = []
  
  // Extract key words from product name (remove common words)
  const commonWords = new Set(['the', 'and', 'or', 'but', 'for', 'with', 'from', 'to', 'of', 'a', 'an', 'in', 'on', 'at', 'by'])
  const words = productName
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !commonWords.has(w))
  
  // Query 1: Just brand (if available)
  if (brand && brand.length > 2) {
    queries.push(brand)
  }
  
  // Query 2: Brand + first key word
  if (brand && words.length > 0) {
    queries.push(`${brand} ${words[0]}`)
  }
  
  // Query 3: First 2-3 key words (most distinctive part)
  if (words.length >= 2) {
    queries.push(words.slice(0, 2).join(' '))
  }
  if (words.length >= 3) {
    queries.push(words.slice(0, 3).join(' '))
  }
  
  // Query 4: Full product name (original)
  const fullQuery = productName
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100)
  if (fullQuery.length > 5) {
    queries.push(fullQuery)
  }
  
  // Remove duplicates and return
  return [...new Set(queries)].filter(q => q.length >= 3)
}

/**
 * Search Reddit for mentions of a specific product
 * Uses multiple search query variations for better matching
 */
async function searchRedditForProduct(productName: string, brand?: string): Promise<RedditSearchResult[]> {
  const results: RedditSearchResult[] = []
  const seenPostIds = new Set<string>() // Avoid duplicates
  
  // Generate multiple search query variations
  const searchQueries = generateSearchQueries(productName, brand)
  
  console.log(`  Trying ${searchQueries.length} search variations: ${searchQueries.slice(0, 3).join(', ')}...`)
  
  // Search each subreddit with each query variation
  for (const subreddit of SUBREDDITS) {
    for (const query of searchQueries) {
      try {
        // Use unquoted search for more flexible matching
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=month&limit=10`
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'StyleLuxe/1.0 (Trending Beauty Products Tracker)',
          },
        })
        
        if (!response.ok) {
          continue // Skip if this query fails
        }
        
        const data: RedditSearchResponse = await response.json()
        
        for (const child of data.data.children) {
          const post = child.data
          
          // Check if post actually mentions the product (fuzzy match)
          const postText = `${post.title} ${post.selftext}`.toLowerCase()
          const productLower = productName.toLowerCase()
          const brandLower = brand?.toLowerCase() || ''
          
          // Check if post mentions brand or key product words
          const mentionsBrand = brandLower && brandLower.length > 2 && postText.includes(brandLower)
          const mentionsProduct = productLower.split(/\s+/).filter(w => w.length > 3).some(word => 
            postText.includes(word)
          )
          
          // Only include posts with significant engagement AND that mention the product
          if ((post.score > 50 || post.num_comments > 5) && (mentionsBrand || mentionsProduct)) {
            if (!seenPostIds.has(post.id)) {
              results.push(post)
              seenPostIds.add(post.id)
            }
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // If we found good results, we can stop trying more queries for this subreddit
        if (results.length >= 5) {
          break
        }
      } catch (error) {
        // Continue with next query
        continue
      }
    }
  }
  
  return results
}

/**
 * Calculate Reddit bonus score based on mentions
 * - Post with >500 upvotes = +20 points
 * - Post with 300-500 upvotes = +15 points
 * - Multiple posts mentioning it = +10 points
 * - Max Reddit bonus: +30 points
 */
function calculateRedditBonusScore(posts: RedditSearchResult[]): number {
  if (posts.length === 0) return 0
  
  let score = 0
  
  // Sort by upvotes (highest first)
  const sortedPosts = [...posts].sort((a, b) => b.score - a.score)
  
  // Count high-engagement posts
  let highEngagementCount = 0
  for (const post of sortedPosts) {
    if (post.score > 500) {
      score += 20
      highEngagementCount++
    } else if (post.score >= 300) {
      score += 15
      highEngagementCount++
    }
    
    // Max 2 posts counted for high engagement
    if (highEngagementCount >= 2) break
  }
  
  // Bonus for multiple mentions
  if (posts.length >= 3) {
    score += 10
  } else if (posts.length >= 2) {
    score += 5
  }
  
  // Cap at 30 points
  return Math.min(30, score)
}

/**
 * Extract top comments from a Reddit post
 */
async function getTopComments(postUrl: string): Promise<string[]> {
  try {
    const commentsUrl = `${postUrl}.json`
    const response = await fetch(commentsUrl, {
      headers: {
        'User-Agent': 'StyleLuxe/1.0 (Trending Beauty Products Tracker)',
      },
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    const comments: string[] = []
    
    // Reddit API returns [post, comments] array
    if (Array.isArray(data) && data.length > 1) {
      const commentsData = data[1].data?.children || []
      
      for (const child of commentsData.slice(0, 3)) {
        const comment = child.data
        if (comment && comment.body && comment.score > 5) {
          comments.push(comment.body.substring(0, 500))
        }
      }
    }
    
    return comments
  } catch (error) {
    return []
  }
}

/**
 * Enrich Amazon products with Reddit data
 */
export async function enrichAmazonWithReddit() {
  console.log('='.repeat(60))
  console.log('Phase 2: Enriching Amazon products with Reddit data')
  console.log('='.repeat(60))
  console.log()
  
  // Get all Amazon products (those with Amazon signals but no Reddit signals yet)
  const amazonProducts = await prisma.product.findMany({
    where: {
      trendSignals: {
        some: {
          source: 'amazon_movers',
        },
      },
      NOT: {
        trendSignals: {
          some: {
            source: 'reddit_skincare',
          },
        },
      },
    },
    include: {
      trendSignals: true,
    },
    take: 50, // Process up to 50 products at a time
  })
  
  console.log(`Found ${amazonProducts.length} Amazon products to enrich\n`)
  
  let enriched = 0
  let totalRedditScore = 0
  
  for (const product of amazonProducts) {
    console.log(`Searching Reddit for: "${product.name}"`)
    
    const redditPosts = await searchRedditForProduct(product.name, product.brand || undefined)
    
    if (redditPosts.length === 0) {
      console.log(`  ❌ No Reddit mentions found\n`)
      continue
    }
    
    console.log(`  ✓ Found ${redditPosts.length} Reddit posts`)
    
    // Calculate Reddit bonus score
    const redditBonus = calculateRedditBonusScore(redditPosts)
    console.log(`  📊 Reddit bonus score: +${redditBonus} points`)
    
    // Store Reddit posts as trend signals
    for (const post of redditPosts.slice(0, 5)) { // Store top 5 posts
      // Use permalink for Reddit discussion page (not the image/external URL)
      const redditPostUrl = post.permalink 
        ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
        : post.url // Fallback to url if permalink not available
      
      // Get top comments using the permalink
      const comments = await getTopComments(redditPostUrl)
      
      await prisma.trendSignal.create({
        data: {
          productId: product.id,
          source: 'reddit_skincare',
          signalType: 'reddit_mention',
          value: post.score,
          metadata: {
            title: post.title,
            url: redditPostUrl, // Use permalink (discussion page) not image URL
            permalink: redditPostUrl, // Store both for clarity
            subreddit: post.subreddit,
            upvotes: post.score,
            comments: post.num_comments,
            author: post.author,
            created_utc: post.created_utc,
            excerpt: post.selftext.substring(0, 200),
            topComments: comments,
          },
        },
      })
    }
    
    // Recalculate total score (Amazon + Reddit bonus)
    const amazonSignals = product.trendSignals.filter(s => s.source === 'amazon_movers')
    let amazonScore = 0
    
    for (const signal of amazonSignals) {
      const metadata = signal.metadata as any
      const salesJump = signal.value || metadata?.salesJumpPercent || 0
      if (salesJump > 0) {
        amazonScore = Math.min(70, Math.floor(salesJump / 20))
        break
      } else {
        amazonScore = 10 // Base score
      }
    }
    
    const totalScore = amazonScore + redditBonus
    
    // Update product with new score
    await prisma.product.update({
      where: { id: product.id },
      data: {
        trendScore: totalScore,
        status: totalScore >= 60 ? 'FLAGGED' : product.status,
      },
    })
    
    console.log(`  ✅ Updated score: ${amazonScore} (Amazon) + ${redditBonus} (Reddit) = ${totalScore} total\n`)
    
    enriched++
    totalRedditScore += redditBonus
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`\n✅ Enrichment complete!`)
  console.log(`   - Enriched: ${enriched} products`)
  console.log(`   - Average Reddit bonus: ${enriched > 0 ? (totalRedditScore / enriched).toFixed(1) : 0} points`)
}

// Run if called directly
if (require.main === module) {
  enrichAmazonWithReddit()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

