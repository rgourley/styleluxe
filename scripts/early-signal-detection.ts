/**
 * Early Signal Detection Script
 * 
 * Phase 3: Weekly scan of Reddit for emerging trends
 * Catches products trending on Reddit before they appear on Amazon Movers & Shakers
 */

import { prisma } from '../lib/prisma'
import { searchAmazonProduct } from '../lib/amazon-search'

interface RedditPost {
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
]

// Common beauty brands to help extract product names
const BEAUTY_BRANDS = [
  'Cerave', 'CeraVe', 'La Roche-Posay', 'The Ordinary', 'Paula\'s Choice',
  'Fenty', 'Fenty Beauty', 'Too Faced', 'Urban Decay', 'NARS', 'MAC',
  'Laneige', 'Cosrx', 'Innisfree', 'Klairs', 'Beauty of Joseon',
  'Glossier', 'Drunk Elephant', 'Sunday Riley', 'Tatcha', 'Dr. Jart',
  'Kiehl\'s', 'Clinique', 'Estée Lauder', 'Lancôme', 'Dior',
]

/**
 * Extract product names from Reddit post
 * Looks for brand + product name patterns
 */
function extractProductNames(post: RedditPost): string[] {
  const products: string[] = []
  const text = `${post.title} ${post.selftext}`.toLowerCase()
  
  // Look for brand mentions followed by product names
  for (const brand of BEAUTY_BRANDS) {
    const brandLower = brand.toLowerCase()
    if (text.includes(brandLower)) {
      // Try to extract product name after brand
      const brandIndex = text.indexOf(brandLower)
      const afterBrand = text.substring(brandIndex + brandLower.length, brandIndex + 100)
      
      // Extract words after brand (likely product name)
      const productMatch = afterBrand.match(/^\s+([a-z][a-z\s-]{5,40})/i)
      if (productMatch) {
        const productName = `${brand} ${productMatch[1].trim()}`
        if (productName.length > 10 && productName.length < 100) {
          products.push(productName)
        }
      } else {
        // Just use brand if no clear product name
        products.push(brand)
      }
    }
  }
  
  // Also look for Amazon links in the post
  const amazonLinkRegex = /(?:https?:\/\/)?(?:www\.)?amazon\.com\/[^\s\)]+/gi
  const amazonLinks = text.match(amazonLinkRegex)
  if (amazonLinks) {
    // Extract product name from Amazon URL or surrounding text
    for (const link of amazonLinks) {
      const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})/)
      if (asinMatch) {
        products.push(`Amazon Product ${asinMatch[1]}`)
      }
    }
  }
  
  return [...new Set(products)] // Remove duplicates
}

/**
 * Fetch top posts from subreddit
 */
async function fetchTopPosts(subreddit: string): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/top/.json?t=week&limit=25`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeautyFinder/1.0 (Trending Beauty Products Tracker)',
      },
    })
    
    if (!response.ok) {
      console.log(`  ⚠️  Failed to fetch r/${subreddit}: ${response.statusText}`)
      return []
    }
    
    const data: RedditResponse = await response.json()
    return data.data.children.map(child => child.data)
  } catch (error) {
    console.error(`  ❌ Error fetching r/${subreddit}:`, error)
    return []
  }
}

/**
 * Calculate initial Reddit score for early signals
 */
function calculateEarlySignalScore(post: RedditPost): number {
  // Base score on engagement
  if (post.score > 500) return 20
  if (post.score >= 300) return 15
  if (post.score >= 100) return 10
  return 5
}

/**
 * Detect early signals from Reddit
 */
export async function detectEarlySignals() {
  console.log('='.repeat(60))
  console.log('Phase 3: Early Signal Detection - Reddit → Amazon')
  console.log('='.repeat(60))
  console.log()
  
  const allPosts: RedditPost[] = []
  
  // Fetch top posts from all subreddits
  for (const subreddit of SUBREDDITS) {
    console.log(`Fetching top posts from r/${subreddit}...`)
    const posts = await fetchTopPosts(subreddit)
    const highEngagement = posts.filter(p => p.score > 500)
    console.log(`  Found ${highEngagement.length} posts with >500 upvotes\n`)
    allPosts.push(...highEngagement)
  }
  
  console.log(`Total high-engagement posts: ${allPosts.length}\n`)
  
  let detected = 0
  let foundOnAmazon = 0
  
  for (const post of allPosts) {
    const productNames = extractProductNames(post)
    
    if (productNames.length === 0) {
      continue
    }
    
    for (const productName of productNames) {
      // Check if product already exists in database
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { contains: productName, mode: 'insensitive' } },
            { brand: { contains: productName.split(' ')[0], mode: 'insensitive' } },
          ],
        },
      })
      
      if (existing) {
        // Product already exists, skip
        continue
      }
      
      console.log(`Early signal detected: "${productName}"`)
      console.log(`  Post: "${post.title.substring(0, 60)}..."`)
      console.log(`  Upvotes: ${post.score}, Comments: ${post.num_comments}`)
      
      // Search Amazon for this product
      const amazonResult = await searchAmazonProduct(productName)
      
      if (!amazonResult) {
        console.log(`  ❌ Not found on Amazon\n`)
        continue
      }
      
      console.log(`  ✓ Found on Amazon: "${amazonResult.name}"`)
      
      // Calculate initial score
      const redditScore = calculateEarlySignalScore(post)
      
      // Create product with early_signal flag
      const product = await prisma.product.create({
        data: {
          name: amazonResult.name || productName,
          brand: amazonResult.brand || productName.split(' ')[0],
          price: amazonResult.price,
          imageUrl: amazonResult.imageUrl,
          amazonUrl: amazonResult.amazonUrl,
          trendScore: redditScore, // Initial score from Reddit
          status: redditScore >= 20 ? 'DRAFT' : 'DRAFT', // Early signals start as DRAFT
        },
      })
      
      // Use permalink for Reddit discussion page (not the image/external URL)
      const redditPostUrl = post.permalink 
        ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
        : post.url // Fallback to url if permalink not available
      
      // Store Reddit signal
      await prisma.trendSignal.create({
        data: {
          productId: product.id,
          source: 'reddit_skincare',
          signalType: 'early_signal',
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
            early_signal: true,
            first_detected: new Date().toISOString(),
          },
        },
      })
      
      console.log(`  ✅ Created early signal product (Score: ${redditScore})\n`)
      
      detected++
      foundOnAmazon++
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log(`\n✅ Early signal detection complete!`)
  console.log(`   - Detected: ${detected} early signals`)
  console.log(`   - Found on Amazon: ${foundOnAmazon}`)
  console.log(`   - Note: These products will be enriched when they appear on Amazon Movers & Shakers`)
}

// Run if called directly
if (require.main === module) {
  detectEarlySignals()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

