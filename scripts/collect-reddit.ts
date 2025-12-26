/**
 * Reddit Data Collection Script
 * 
 * Scrapes trending posts from beauty-related subreddits to find products
 * that are being discussed and trending.
 */

import { prisma } from '../lib/prisma'
import { searchAmazonProduct } from './search-amazon-product'

// Node.js 18+ has native fetch, but if running in older versions, this will work

interface RedditPost {
  title: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
  author: string
  url: string
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

// Primary subreddits (start with these)
const PRIMARY_SUBREDDITS = [
  'SkincareAddiction',    // 1.4M members - skincare
  'MakeupAddiction',      // 4.7M members - makeup
  'AsianBeauty',          // 567K members - K-beauty
]

// Secondary subreddits (add as needed)
const SECONDARY_SUBREDDITS = [
  'BeautyGuruChatter',    // 417K - influencer trends
  '30PlusSkinCare',       // 282K - anti-aging
  'Sephora',              // 223K - retail trends
  'HaircareScience',      // 473K - hair products
  'curlyhair',            // 400K+ - curly hair products
]

// Use primary for MVP, can add secondary later
const SUBREDDITS = PRIMARY_SUBREDDITS

/**
 * Fetch comments from a Reddit post
 * Reddit API: https://www.reddit.com/r/{subreddit}/comments/{post_id}.json
 */
async function fetchPostComments(postId: string, subreddit: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeautyFinder/1.0 (Data Collection Bot)',
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    // Reddit returns [post, comments] - we want comments
    const commentsData = data[1]?.data?.children || []
    
    const amazonLinks: string[] = []
    const amazonRegex = /(https?:\/\/(?:www\.)?(?:amazon\.com|amzn\.to)\/[^\s\)]+)/gi
    
    // Extract Amazon links from all comments
    for (const comment of commentsData) {
      const commentText = comment.data?.body || ''
      const matches = commentText.match(amazonRegex)
      if (matches) {
        amazonLinks.push(...matches)
      }
    }
    
    return [...new Set(amazonLinks)] // Remove duplicates
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error)
    return []
  }
}

/**
 * Extract Amazon product URL from Amazon link
 * Handles both direct links and shortened amzn.to links
 */
async function extractAmazonUrl(amazonLink: string): Promise<string | null> {
  try {
    // If it's a shortened link, we'd need to follow it, but for now just extract direct links
    if (amazonLink.includes('amazon.com')) {
      // Extract the product URL (everything up to query params or ref)
      const url = new URL(amazonLink)
      // Reconstruct clean product URL
      const productUrl = `https://www.amazon.com${url.pathname}`
      return productUrl
    }
    // For amzn.to links, we'd need to follow redirects, but skip for now
    return null
  } catch (error) {
    return null
  }
}

/**
 * Fetch trending posts from a subreddit
 */
async function fetchSubredditPosts(subreddit: string): Promise<RedditPost[]> {
  try {
    // Reddit JSON API - fetch top posts from past week, limit 15
    // Only get posts from the last 7 days (not older)
    // Reduced from 25 to 15 to focus on highest quality posts
    const url = `https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=15`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeautyFinder/1.0 (Data Collection Bot)',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${subreddit}: ${response.statusText}`)
      return []
    }

    const data: RedditResponse = await response.json()
    const now = Date.now() / 1000
    const sevenDaysAgo = now - (7 * 24 * 60 * 60)
    
    // Filter to only include posts from the last 7 days
    return data.data.children
      .map((child) => child.data)
      .filter((post) => post.created_utc >= sevenDaysAgo)
  } catch (error) {
    console.error(`Error fetching ${subreddit}:`, error)
    return []
  }
}

/**
 * Extract product information from Reddit post text
 */
interface ProductInfo {
  name: string
  brand?: string
  description?: string
  price?: number
  review?: string
  rating?: number
}

/**
 * Extract product names from text using simple heuristics
 * This is a basic implementation - can be improved with NLP/ML
 */
function extractProductNames(text: string): string[] {
  const products: string[] = []
  const lowerText = text.toLowerCase()

  // Common patterns that indicate product mentions:
  // - "I've been using [Product Name]"
  // - "Has anyone tried [Product Name]?"
  // - "[Brand] [Product Name]"
  // - Products often have capital letters or brand names

  // Look for common beauty brand names followed by product names
  const brands = [
    'cerave', 'neutrogena', 'la roche-posay', 'the ordinary', 'paula\'s choice',
    'drunken elephant', 'glossier', 'fenty', 'rare beauty', 'tatcha',
    'fresh', 'kiehl\'s', 'clinique', 'estee lauder', 'lancome',
    'nars', 'mac', 'urban decay', 'too faced', 'anastasia beverly hills',
  ]

  // Simple extraction: find brand mentions
  for (const brand of brands) {
    if (lowerText.includes(brand)) {
      // Try to extract the product name after the brand
      const regex = new RegExp(`${brand}[\\s-]+([A-Z][a-zA-Z\\s-]+)`, 'gi')
      const matches = text.match(regex)
      if (matches) {
        products.push(...matches.map(m => m.trim()))
      } else {
        // Just add the brand if we can't find a specific product
        products.push(brand)
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(products)]
}

/**
 * Extract product information from Reddit post
 * Gets descriptions, reviews, prices, etc.
 */
function extractProductInfo(post: RedditPost, productName: string): Partial<ProductInfo> {
  const combinedText = `${post.title} ${post.selftext}`.toLowerCase()
  const info: Partial<ProductInfo> = { name: productName }

  // Extract brand
  const brandMatch = productName.match(/^([A-Z][a-zA-Z\s&]+?)\s+/)
  if (brandMatch) {
    info.brand = brandMatch[1].trim()
  }

  // Extract price mentions (e.g., "$25", "costs $30", "around $20")
  const priceMatches = combinedText.match(/(?:costs?|price|around|about|only)\s*\$?([\d,]+\.?\d*)/i)
  if (priceMatches) {
    info.price = parseFloat(priceMatches[1].replace(/,/g, ''))
  }

  // Extract rating (e.g., "5/5", "10/10", "5 stars")
  const ratingMatch = combinedText.match(/(\d+)\s*(?:\/10|\/5|stars?)/i)
  if (ratingMatch) {
    const rating = parseInt(ratingMatch[1])
    info.rating = rating <= 10 ? rating : Math.round(rating / 2) // Convert /10 to /5 scale
  }

  // Extract review/description (first 500 chars of post text mentioning the product)
  const productLower = productName.toLowerCase()
  const productIndex = combinedText.indexOf(productLower)
  if (productIndex !== -1) {
    // Get context around product mention
    const start = Math.max(0, productIndex - 100)
    const end = Math.min(combinedText.length, productIndex + productLower.length + 400)
    const context = `${post.title} ${post.selftext}`.substring(start, end)
    
    // Clean up the review text
    info.review = context
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500)
    
    // Use post title + first part of selftext as description
    if (post.selftext) {
      info.description = `${post.title}. ${post.selftext.substring(0, 200)}...`
    } else {
      info.description = post.title
    }
  }

  return info
}

/**
 * Calculate Reddit engagement score
 * 
 * Reddit Scoring (50 points max):
 * - Each post with >300 upvotes mentioning the product = 25 points
 * - Max 2 posts counted = 50 points max
 */
function calculateRedditScore(posts: RedditPost[]): number {
  // Sort posts by upvotes (highest first)
  const sortedPosts = [...posts].sort((a, b) => b.score - a.score)
  
  // Count up to 2 posts with >300 upvotes = 25 points each
  // But also give partial credit for posts with 100-300 upvotes
  let score = 0
  let postsCounted = 0
  
  for (const post of sortedPosts) {
    if (postsCounted >= 2) break // Max 2 posts
    
    if (post.score > 300) {
      score += 25 // Full points for >300 upvotes
      postsCounted++
    } else if (post.score >= 100 && postsCounted < 2) {
      // Partial credit: 100-300 upvotes = 10-20 points (scaled)
      const partialScore = Math.floor((post.score / 300) * 25) // Scale from 0-25 based on upvotes
      score += Math.max(10, partialScore) // Minimum 10 points for 100+ upvotes
      postsCounted++
    }
  }
  
  // Cap at 50 points max
  return Math.min(50, score)
}

/**
 * Process Reddit posts and store products in database
 */
async function processRedditData() {
  console.log('Starting Reddit data collection...\n')

  const allPosts: RedditPost[] = []

  // Fetch posts from all subreddits
  for (const subreddit of SUBREDDITS) {
    console.log(`Fetching from r/${subreddit}...`)
    const posts = await fetchSubredditPosts(subreddit)
    allPosts.push(...posts)
    const topScore = posts.length > 0 ? Math.max(...posts.map(p => p.score)) : 0
    console.log(`  Found ${posts.length} posts (top score: ${topScore})`)
  }

  console.log(`\nTotal posts collected: ${allPosts.length}`)
  console.log(`Posts with >100 upvotes: ${allPosts.filter(p => p.score > 100).length}`)
  console.log(`Posts with >300 upvotes: ${allPosts.filter(p => p.score > 300).length}\n`)

  // Extract products and count mentions
  // Track: count, posts, product info, and if mentioned in top comments
  const productMentions = new Map<string, { 
    count: number
    posts: RedditPost[]
    inTopComments: boolean
    productInfo: Partial<ProductInfo>
  }>()

  for (const post of allPosts) {
    const combinedText = `${post.title} ${post.selftext}`
    const products = extractProductNames(combinedText)
    
    // Extract Amazon links from post text
    const amazonLinks: string[] = []
    const amazonRegex = /(https?:\/\/(?:www\.)?(?:amazon\.com|amzn\.to)\/[^\s\)]+)/gi
    const postMatches = combinedText.match(amazonRegex)
    if (postMatches) {
      amazonLinks.push(...postMatches)
    }
    
    // Try to fetch comments and extract Amazon links (for posts with many comments)
    // Note: Reddit may rate limit, so we'll try but not fail if it doesn't work
    if (post.num_comments > 5 && amazonLinks.length === 0) {
      try {
        const commentLinks = await fetchPostComments(post.id, post.subreddit)
        amazonLinks.push(...commentLinks)
      } catch (error) {
        // Silently fail - comments are optional
      }
    }

    // Check if post has high comment count (likely has top comments)
    const hasTopComments = post.num_comments > 10

    for (const productName of products) {
      if (!productMentions.has(productName)) {
        productMentions.set(productName, { 
          count: 0, 
          posts: [],
          inTopComments: false,
          productInfo: {}
        })
      }
      const entry = productMentions.get(productName)!
      entry.count++
      entry.posts.push(post)
      
      // Mark if mentioned in a post with top comments
      if (hasTopComments) {
        entry.inTopComments = true
      }

      // Extract product info from the most popular post
      if (post.score > (entry.posts[0]?.score || 0)) {
        entry.productInfo = extractProductInfo(post, productName)
      }
      
      // Store Amazon links found in this post
      if (amazonLinks.length > 0) {
        // Use the first Amazon link found
        const cleanUrl = await extractAmazonUrl(amazonLinks[0])
        if (cleanUrl) {
          (entry.productInfo as any).amazonUrl = cleanUrl
        }
      }
    }
  }

  console.log(`Found ${productMentions.size} unique product mentions\n`)

  // Process and store products
  let stored = 0
  let updated = 0

  for (const [productName, { count, posts, inTopComments, productInfo }] of productMentions.entries()) {
    if (count < 1) continue // Skip products with no mentions

    // Calculate Reddit score (50 points max)
    const redditScore = calculateRedditScore(posts)
    
    // Debug logging
    if (redditScore > 0) {
      console.log(`  ${productName}: Reddit score = ${redditScore} (from ${posts.length} posts)`)
    }
    
    // Check if product exists in database to get Amazon score
    const existing = await prisma.product.findFirst({
      where: {
        name: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      include: {
        trendSignals: {
          where: {
            source: 'amazon_movers',
          },
        },
      },
    })

    // Calculate Amazon score from existing signals (if any)
    let amazonScore = 0
    if (existing) {
      for (const signal of existing.trendSignals) {
        const salesJump = signal.value || (signal.metadata as any)?.salesJumpPercent || 0
        if (salesJump > 0) {
          amazonScore = Math.min(50, Math.floor(salesJump / 30))
          break // Use the highest Amazon score
        }
      }
    }

    // Total trend score = Amazon + Reddit (max 100)
    const trendScore = amazonScore + redditScore

    // Store products even if score < 60 - they might get Amazon score later
    // We'll filter by score >= 60 when displaying/flagging, not when storing
    // This allows products from different sources to be combined during enrichment

    try {
      // Check if product already exists (by name) - we already fetched this above
      // But we need to fetch again with all signals for update
      const existingForUpdate = existing ? await prisma.product.findFirst({
        where: {
          name: {
            contains: productName,
            mode: 'insensitive',
          },
        },
        include: {
          trendSignals: true,
        },
      }) : null

      if (existingForUpdate) {
        // Recalculate total score (Amazon + Reddit)
        let amazonScoreForUpdate = 0
        for (const signal of existingForUpdate.trendSignals) {
          if (signal.source === 'amazon_movers') {
            const salesJump = signal.value || (signal.metadata as any)?.salesJumpPercent || 0
            if (salesJump > 0) {
              amazonScoreForUpdate = Math.min(50, Math.floor(salesJump / 30))
            }
          }
        }
        const totalScore = amazonScoreForUpdate + redditScore

        // Update existing product with extracted info
        await prisma.product.update({
          where: { id: existingForUpdate.id },
          data: {
            trendScore: Math.max(existingForUpdate.trendScore, totalScore), // Keep highest score
            brand: productInfo.brand || existingForUpdate.brand,
            price: productInfo.price || existingForUpdate.price,
          },
        })

        // Add new trend signal for each post with >300 upvotes (up to 2)
        const postsToStore = posts
          .filter(p => p.score > 300)
          .sort((a, b) => b.score - a.score)
          .slice(0, 2) // Max 2 posts

        for (const post of postsToStore) {
          await prisma.trendSignal.create({
            data: {
              productId: existingForUpdate.id,
              source: 'reddit_skincare',
              signalType: 'reddit_mentions',
              value: post.score, // Store upvote count
              metadata: {
                subreddit: post.subreddit,
                postTitle: post.title,
                score: post.score,
                comments: post.num_comments,
                url: post.url.startsWith('http') ? post.url : `https://reddit.com${post.url}`,
                created: new Date(post.created_utc * 1000).toISOString(),
                description: productInfo.description,
              },
            },
          })
        }

        // Store Reddit reviews if we have review text
        const topPost = posts[0] // Get the top post (highest score)
        if (productInfo.review && topPost?.selftext) {
          await prisma.review.create({
            data: {
              productId: existingForUpdate.id,
              source: 'REDDIT',
              content: productInfo.review,
              rating: productInfo.rating || null,
              author: topPost.author,
              date: new Date(topPost.created_utc * 1000),
              helpful: topPost.score,
              verified: false,
            },
          })
        }

        // Note: Reddit review already stored above for existingForUpdate

        updated++
      } else {
        // If we found an Amazon URL in Reddit, try to match with existing Amazon product FIRST
        if ((productInfo as any).amazonUrl) {
          const amazonUrl = (productInfo as any).amazonUrl
          const existingAmazon = await prisma.product.findFirst({
            where: {
              amazonUrl: amazonUrl,
            },
            include: {
              trendSignals: true,
            },
          })
          
          if (existingAmazon) {
            // Add Reddit signals to existing Amazon product
            const postsToStore = posts
              .filter(p => p.score > 300)
              .sort((a, b) => b.score - a.score)
              .slice(0, 2) // Max 2 posts

            for (const post of postsToStore) {
              await prisma.trendSignal.create({
                data: {
                  productId: existingAmazon.id,
                  source: 'reddit_skincare',
                  signalType: 'reddit_mentions',
                  value: post.score,
                  metadata: {
                    subreddit: post.subreddit,
                    postTitle: post.title,
                    score: post.score,
                    comments: post.num_comments,
                    url: post.url.startsWith('http') ? post.url : `https://reddit.com${post.url}`,
                    created: new Date(post.created_utc * 1000).toISOString(),
                    description: productInfo.description,
                    amazonUrl: amazonUrl, // Store the Amazon URL found in Reddit
                  },
                },
              })
            }
            
            // Recalculate total score (Amazon + Reddit)
            const allSignals = await prisma.trendSignal.findMany({
              where: { productId: existingAmazon.id },
            })
            
            let amazonScore = 0
            for (const signal of allSignals) {
              if (signal.source === 'amazon_movers') {
                const metadata = signal.metadata as any
                const salesJump = signal.value || metadata?.salesJumpPercent || 0
                if (salesJump > 0) {
                  amazonScore = Math.min(50, Math.floor(salesJump / 30))
                } else {
                  amazonScore = 15 // Base score
                }
                break
              }
            }
            
            const redditSignals = allSignals
              .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
              .sort((a, b) => (b.value || 0) - (a.value || 0))
              .slice(0, 2)
            const redditScore = Math.min(50, redditSignals.length * 25)
            const totalScore = amazonScore + redditScore
            
            // Update Amazon product with Reddit data and combined score
            await prisma.product.update({
              where: { id: existingAmazon.id },
              data: {
                trendScore: Math.max(existingAmazon.trendScore, totalScore),
                status: totalScore >= 60 ? 'FLAGGED' : existingAmazon.status,
              },
            })
            
            console.log(`  ✓ Matched Reddit product "${productName}" with Amazon product via URL (Score: ${totalScore})`)
            updated++
            continue // Skip creating separate product
          }
        }
        
        // Create new product with extracted info
        const product = await prisma.product.create({
          data: {
            name: productName,
            brand: productInfo.brand || null,
            price: productInfo.price || null,
            amazonUrl: (productInfo as any).amazonUrl || null, // Store Amazon URL if found
            trendScore,
            status: trendScore >= 60 ? 'FLAGGED' : 'DRAFT', // Flag if score >= 60, otherwise draft
          },
        })

        // Get the top post (highest score)
        const topPost = posts[0]

        // Add trend signal
        await prisma.trendSignal.create({
          data: {
            productId: product.id,
            source: 'reddit_skincare',
            signalType: 'reddit_mentions',
            value: topPost?.score || 0, // Store upvote count as value for scoring
            metadata: {
              subreddits: [...new Set(posts.map(p => p.subreddit))],
              mentionCount: count,
              topPost: topPost ? {
                title: topPost.title,
                score: topPost.score,
                comments: topPost.num_comments,
                url: topPost.url.startsWith('http') ? topPost.url : `https://reddit.com${topPost.url}`,
                created: new Date(topPost.created_utc * 1000).toISOString(),
              } : null,
              description: productInfo.description,
            },
          },
        })

        // Update product with calculated trend score
        await prisma.product.update({
          where: { id: product.id },
          data: {
            trendScore: trendScore, // Use the calculated score
          },
        })

        // Store Reddit review if we have review text
        if (productInfo.review && topPost?.selftext) {
          await prisma.review.create({
            data: {
              productId: product.id,
              source: 'REDDIT',
              content: productInfo.review,
              rating: productInfo.rating || null,
              author: topPost.author,
              date: new Date(topPost.created_utc * 1000),
              helpful: topPost.score,
              verified: false,
            },
          })
        }

        // Search Amazon for this Reddit product to find Amazon listing
        console.log(`  Searching Amazon for: "${productName}"`)
        const amazonResult = await searchAmazonProduct(productName)
        
        if (amazonResult) {
          // Check if this Amazon product already exists in database
          const existingAmazon = await prisma.product.findFirst({
            where: {
              amazonUrl: amazonResult.amazonUrl,
            },
            include: {
              trendSignals: true,
            },
          })
          
          if (existingAmazon) {
            // Merge: Transfer Reddit signals to existing Amazon product
            const redditSignals = await prisma.trendSignal.findMany({
              where: { productId: product.id },
            })
            
            for (const signal of redditSignals) {
              await prisma.trendSignal.update({
                where: { id: signal.id },
                data: { productId: existingAmazon.id },
              })
            }
            
            // Recalculate combined score
            const allSignals = await prisma.trendSignal.findMany({
              where: { productId: existingAmazon.id },
            })
            
            let amazonScore = 0
            for (const signal of allSignals) {
              if (signal.source === 'amazon_movers') {
                const metadata = signal.metadata as any
                const salesJump = signal.value || metadata?.salesJumpPercent || 0
                if (salesJump > 0) {
                  amazonScore = Math.min(50, Math.floor(salesJump / 30))
                } else {
                  amazonScore = 15
                }
                break
              }
            }
            
            const redditSignalsForScore = allSignals
              .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
              .sort((a, b) => (b.value || 0) - (a.value || 0))
              .slice(0, 2)
            const redditScore = Math.min(50, redditSignalsForScore.length * 25)
            const totalScore = amazonScore + redditScore
            
            // Update Amazon product
            await prisma.product.update({
              where: { id: existingAmazon.id },
              data: {
                trendScore: Math.max(existingAmazon.trendScore, totalScore),
                status: totalScore >= 60 ? 'FLAGGED' : existingAmazon.status,
                // Update with better data if available
                name: existingAmazon.name || amazonResult.name,
                brand: existingAmazon.brand || amazonResult.brand,
                price: existingAmazon.price || amazonResult.price,
                imageUrl: existingAmazon.imageUrl || amazonResult.imageUrl,
              },
            })
            
            // Delete the Reddit-only product (merged into Amazon)
            await prisma.product.delete({ where: { id: product.id } })
            
            console.log(`  ✓ Matched "${productName}" with existing Amazon product (Score: ${totalScore})`)
            updated++
            continue
          } else {
            // Update Reddit product with Amazon data
            await prisma.product.update({
              where: { id: product.id },
              data: {
                amazonUrl: amazonResult.amazonUrl,
                price: product.price || amazonResult.price,
                imageUrl: product.imageUrl || amazonResult.imageUrl,
                brand: product.brand || amazonResult.brand,
              },
            })
            
            console.log(`  ✓ Found Amazon listing for "${productName}"`)
          }
        }
        
        // Also try to find matching Amazon product in database (fallback)
        await tryMatchAmazonProduct(product.id, productName)

        stored++
      }
    } catch (error) {
      console.error(`Error processing ${productName}:`, error)
    }
  }

  console.log(`\n✅ Reddit data collection complete!`)
  console.log(`   - Stored: ${stored} new products (score > 60)`)
  console.log(`   - Updated: ${updated} existing products`)
  console.log(`   - Products with score > 60 are flagged for review generation`)
}

// Note: This script is meant to be run via the main collect-data.ts script
// or directly with: npm run collect:reddit

/**
 * Try to match a Reddit product with an existing Amazon product in the database
 * This enriches Reddit products with Amazon URLs, prices, images even if we didn't search Amazon
 */
async function tryMatchAmazonProduct(productId: string, productName: string) {
  try {
    // Normalize product name for matching
    const normalize = (name: string) => 
      name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '')
    
    const normalizedName = normalize(productName)
    
    // Extract brand if present (first capitalized word)
    const brandMatch = productName.match(/^([A-Z][a-zA-Z\s&]+?)\s+/)
    const brand = brandMatch ? brandMatch[1].trim() : null
    
    // Look for Amazon products with similar names
    const amazonProducts = await prisma.product.findMany({
      where: {
        amazonUrl: { not: null },
        // Try to match by name similarity
        OR: [
          {
            name: {
              contains: normalizedName.split(' ')[0], // First word (often brand)
              mode: 'insensitive',
            },
          },
          ...(brand ? [{
              brand: {
                contains: brand,
                mode: 'insensitive' as const,
              },
          }] : []),
        ],
      },
      include: {
        trendSignals: {
          where: {
            source: 'amazon_movers',
          },
        },
      },
    })

    // Find best match by name similarity
    let bestMatch: typeof amazonProducts[0] | null = null
    let bestScore = 0

    for (const amazonProduct of amazonProducts) {
      const amazonNormalized = normalize(amazonProduct.name)
      
      // Calculate similarity (simple word overlap)
      const words1 = new Set(normalizedName.split(/\s+/))
      const words2 = new Set(amazonNormalized.split(/\s+/))
      const intersection = new Set([...words1].filter(x => words2.has(x)))
      const union = new Set([...words1, ...words2])
      const similarity = intersection.size / union.size
      
      if (similarity > bestScore && similarity > 0.5) { // 50% similarity threshold
        bestScore = similarity
        bestMatch = amazonProduct
      }
    }

    // If we found a good match, merge the data
    if (bestMatch) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          amazonUrl: bestMatch.amazonUrl || undefined,
          price: bestMatch.price || undefined,
          imageUrl: bestMatch.imageUrl || undefined,
          brand: bestMatch.brand || undefined,
          // Update name if Amazon has a better/more complete name
          name: bestMatch.name.length > productName.length ? bestMatch.name : productName,
        },
      })

      // Transfer Amazon trend signals to this product
      for (const signal of bestMatch.trendSignals) {
        await prisma.trendSignal.update({
          where: { id: signal.id },
          data: { productId },
        })
      }

      // If the Amazon product has no Reddit signals, we can optionally delete it
      // (since we're merging into the Reddit product)
      const amazonProductSignals = await prisma.trendSignal.findMany({
        where: { productId: bestMatch.id },
      })
      
      const hasNonAmazonSignals = amazonProductSignals.some(s => s.source !== 'amazon_movers')
      
      if (!hasNonAmazonSignals && bestMatch.id !== productId) {
        // Delete the Amazon product since we merged it into Reddit product
        await prisma.product.delete({ where: { id: bestMatch.id } })
      }
    }
  } catch (error) {
    // Silently fail - matching is optional
    console.error(`Error matching Amazon product for ${productName}:`, error)
  }
}

export { processRedditData }

