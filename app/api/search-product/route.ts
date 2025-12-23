import { NextResponse } from 'next/server'
import { searchAmazonProduct } from '@/lib/amazon-search'
import { scrapeAmazonProductPage } from '@/lib/amazon-product-scraper'
import { prisma } from '@/lib/prisma'

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
 * Search Reddit for a product term
 * Tries multiple search strategies: exact match, brand only, product name only
 */
async function searchReddit(term: string): Promise<RedditPost[]> {
  const results: RedditPost[] = []
  const seenPostIds = new Set<string>()

  // Try multiple search strategies
  const searchTerms = [term]
  
  // If term has multiple words, try variations
  const words = term.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 2) {
    // Try brand only (first word)
    searchTerms.push(words[0])
    // Try brand + product (first + last)
    if (words.length >= 3) {
      searchTerms.push(`${words[0]} ${words[words.length - 1]}`)
    }
  }

  for (const searchTerm of searchTerms) {
    for (const subreddit of SUBREDDITS) {
      try {
        // Search Reddit - try different time ranges
        const timeRanges = ['month', 'year', 'all']
        
        for (const timeRange of timeRanges) {
          const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerm)}&restrict_sr=1&sort=top&t=${timeRange}&limit=10`
          
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; StyleLuxe/1.0; +https://styleluxe.com)',
            },
          })

          if (!response.ok) continue

          const data: RedditResponse = await response.json()

          for (const child of data.data.children) {
            const post = child.data
            
            // Lower threshold for engagement (30 instead of 50)
            if (post.score > 30 && !seenPostIds.has(post.id)) {
              results.push(post)
              seenPostIds.add(post.id)
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // If we found results, we can stop trying other time ranges
          if (results.length >= 5) break
        }
      } catch (error) {
        console.error(`Error searching ${subreddit} for "${searchTerm}":`, error)
        continue
      }
    }
    
    // If we found enough results, stop trying other search terms
    if (results.length >= 10) break
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10) // Top 10
}

/**
 * Search both Amazon and Reddit for a product term
 */
export async function POST(request: Request) {
  try {
    const { term } = await request.json()

    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search term is required' },
        { status: 400 }
      )
    }

    const searchTerm = term.trim()
    console.log(`Searching for: "${searchTerm}"`)

    // Check if input is an Amazon URL
    const isAmazonUrl = /^https?:\/\/(www\.)?amazon\.(com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx)\//i.test(searchTerm)
    
    // Check if input is an ASIN (Amazon product ID) - 10 alphanumeric characters
    const asinMatch = searchTerm.match(/^([A-Z0-9]{10})$/i)
    const isAsin = asinMatch !== null
    
    let amazonResult: any = null

    // If it's an ASIN, convert to Amazon URL
    if (isAsin) {
      const asin = asinMatch[1].toUpperCase()
      const amazonUrl = `https://www.amazon.com/dp/${asin}`
      console.log(`🔍 Detected ASIN: ${asin}, converting to URL: ${amazonUrl}`)
      
      // Scrape product directly from ASIN URL
      const scrapedProduct = await scrapeAmazonProductPage(amazonUrl)
      
      if (scrapedProduct) {
        amazonResult = {
          name: scrapedProduct.name,
          brand: scrapedProduct.brand,
          price: scrapedProduct.price,
          imageUrl: scrapedProduct.imageUrl,
          amazonUrl: scrapedProduct.amazonUrl,
          rating: scrapedProduct.starRating,
          reviewCount: scrapedProduct.totalReviewCount,
        }
        console.log(`✅ Amazon product scraped from ASIN: ${amazonResult.name}`)
      } else {
        console.log('❌ Failed to scrape Amazon product from ASIN')
      }
    } else if (isAmazonUrl) {
      // STEP 1: Scrape product directly from URL
      console.log('🔍 Step 1: Scraping Amazon product page from URL...')
      const scrapedProduct = await scrapeAmazonProductPage(searchTerm)
      
      if (scrapedProduct) {
        // Convert scraped product format to search result format
        amazonResult = {
          name: scrapedProduct.name,
          brand: scrapedProduct.brand,
          price: scrapedProduct.price,
          imageUrl: scrapedProduct.imageUrl,
          amazonUrl: scrapedProduct.amazonUrl,
          rating: scrapedProduct.starRating,
          reviewCount: scrapedProduct.totalReviewCount,
        }
        console.log(`✅ Amazon product scraped: ${amazonResult.name}`)
      } else {
        console.log('❌ Failed to scrape Amazon product from URL, trying search fallback...')
        // Fallback: Try to extract product name from URL and search for it
        try {
          const urlObj = new URL(searchTerm)
          const pathParts = urlObj.pathname.split('/').filter(p => p && p !== 'dp' && !p.match(/^[A-Z0-9]{10}$/))
          if (pathParts.length > 0) {
            // Use the last meaningful part of the path as search term
            const lastPart = pathParts[pathParts.length - 1]
            const searchQuery = lastPart.replace(/-/g, ' ').substring(0, 100)
            console.log(`Trying search fallback with: "${searchQuery}"`)
            amazonResult = await searchAmazonProduct(searchQuery)
            if (amazonResult) {
              console.log(`✅ Found product via search fallback: ${amazonResult.name}`)
            }
          }
        } catch (error) {
          console.error('Error in search fallback:', error)
        }
      }
    } else {
      // STEP 1: Search Amazon FIRST (required before Reddit search)
      console.log('🔍 Step 1: Searching Amazon first...')
      amazonResult = await searchAmazonProduct(searchTerm)
      console.log(amazonResult ? `✅ Amazon found: ${amazonResult.name}` : '❌ Amazon found no results')
    }
    
    // STEP 2: Search Reddit AFTER Amazon search completes
    // Use Amazon product name if found, otherwise use original search term
    let redditResults: RedditPost[] = []
    console.log('🔍 Step 2: Searching Reddit (after Amazon search)...')
    if (amazonResult) {
      // Use Amazon product name and brand for more accurate Reddit search
      const redditSearchTerm = amazonResult.brand 
        ? `${amazonResult.brand} ${amazonResult.name}`
        : amazonResult.name
      redditResults = await searchReddit(redditSearchTerm)
      console.log(`✅ Reddit search complete: ${redditResults.length} posts found`)
    } else {
      // Still search Reddit even if Amazon didn't find anything
      console.log('⚠️ Amazon search returned no results. Searching Reddit with original term...')
      redditResults = await searchReddit(searchTerm)
      console.log(`✅ Reddit search complete: ${redditResults.length} posts found`)
    }

    // Check if product already exists in database
    let existingProduct = null
    if (amazonResult) {
      existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { amazonUrl: amazonResult.amazonUrl },
            { name: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          trendSignals: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      amazon: amazonResult ? {
        name: amazonResult.name,
        brand: amazonResult.brand,
        price: amazonResult.price,
        imageUrl: amazonResult.imageUrl,
        amazonUrl: amazonResult.amazonUrl,
        rating: amazonResult.rating,
        reviewCount: amazonResult.reviewCount,
      } : null,
      reddit: redditResults.map(post => ({
        id: post.id,
        title: post.title,
        selftext: post.selftext.substring(0, 300) + (post.selftext.length > 300 ? '...' : ''),
        score: post.score,
        num_comments: post.num_comments,
        subreddit: post.subreddit,
        url: post.permalink 
          ? (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`)
          : `https://www.reddit.com${post.url}`,
        created_utc: post.created_utc,
        author: post.author,
      })),
      existingProduct: existingProduct ? {
        id: existingProduct.id,
        name: existingProduct.name,
        status: existingProduct.status,
        trendScore: existingProduct.trendScore,
        hasContent: !!existingProduct.content,
      } : null,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

