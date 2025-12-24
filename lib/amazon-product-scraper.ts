/**
 * Enhanced Amazon Product Scraper
 * Scrapes detailed product data including reviews, Q&A, and metadata
 */

import * as cheerio from 'cheerio'

export interface AmazonProductDetails {
  // Basic product info
  name: string
  brand?: string
  price?: number
  currency?: string
  imageUrl?: string
  amazonUrl: string
  asin?: string
  
  // Ratings and reviews
  starRating?: number
  totalReviewCount?: number
  availability?: string
  
  // Product description
  description?: string
  keyFeatures?: string[]
  
  // Reviews (will be stored separately in database)
  reviews?: AmazonReview[]
  
  // Q&A
  questions?: AmazonQuestion[]
}

export interface AmazonReview {
  rating: number // 1-5 stars
  title?: string
  content: string
  author?: string
  date?: Date
  helpful?: number // Number of helpful votes
  verified?: boolean
  reviewType?: 'most_helpful' | 'most_recent'
}

export interface AmazonQuestion {
  question: string
  answer?: string
  answerAuthor?: string
  helpful?: number
}

/**
 * Scrape detailed product information from Amazon product page
 */
export async function scrapeAmazonProductPage(amazonUrl: string): Promise<AmazonProductDetails | null> {
  try {
    // Extract ASIN from URL if possible
    const asinMatch = amazonUrl.match(/\/dp\/([A-Z0-9]{10})|ASIN[=:]([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i)
    let asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : null
    
    // Normalize URL - try to get the full URL (follow redirects)
    let productUrl = amazonUrl
    if (!asin) {
      // If no ASIN in URL, try to fetch and follow redirects
      try {
        const redirectResponse = await fetch(amazonUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })
        if (redirectResponse.url && redirectResponse.url !== amazonUrl) {
          productUrl = redirectResponse.url
          // Try to extract ASIN from redirected URL
          const redirectedAsinMatch = redirectResponse.url.match(/\/dp\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i)
          if (redirectedAsinMatch) {
            asin = redirectedAsinMatch[1] || redirectedAsinMatch[2]
          }
        }
      } catch (error) {
        console.warn('Could not follow redirect, using original URL:', error)
      }
    } else {
      // If we have ASIN, use the canonical product URL
      productUrl = `https://www.amazon.com/dp/${asin}`
    }

    console.log(`Scraping Amazon URL: ${productUrl}${asin ? ` (ASIN: ${asin})` : ' (no ASIN found)'}`)

    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.amazon.com/',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error(`Failed to fetch Amazon page: ${response.status} ${response.statusText}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try to extract ASIN from the page if we don't have it yet
    if (!asin) {
      // Look for ASIN in page metadata
      const pageAsin = $('#ASIN').val() || 
                       $('[data-asin]').first().attr('data-asin') ||
                       html.match(/data-asin=["']([A-Z0-9]{10})["']/)?.[1] ||
                       html.match(/ASIN["']?\s*[:=]\s*["']?([A-Z0-9]{10})/i)?.[1]
      if (pageAsin && pageAsin.length === 10) {
        asin = pageAsin
        console.log(`Found ASIN in page: ${asin}`)
      }
    }

    // Extract product name
    const name = $('#productTitle').text().trim() || 
                 $('h1.a-size-large').text().trim() ||
                 $('span#productTitle').text().trim()

    if (!name || name.length < 3) {
      console.error('Could not extract product name')
      return null
    }

    // Extract brand
    const brand = $('#brand').text().trim() || 
                 $('a#brand').text().trim() ||
                 name.split(' ')[0] // Fallback to first word

    // Extract price
    const priceText = $('.a-price .a-offscreen').first().text() ||
                     $('.a-price-whole').first().text() ||
                     $('#priceblock_ourprice').text() ||
                     $('#priceblock_dealprice').text()
    const priceMatch = priceText?.match(/\$?([\d,]+\.?\d*)/)
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined

    // Extract currency
    const currency = priceText?.includes('$') ? 'USD' : 'USD'

    // Extract image
    const imageUrl = $('#landingImage').attr('data-old-src') ||
                    $('#landingImage').attr('src') ||
                    $('#imgBlkFront').attr('src') ||
                    $('.a-dynamic-image').first().attr('src')

    // Extract star rating
    const ratingText = $('#acrPopover .a-icon-alt').first().text() || 
                      $('.a-icon-alt').first().text() ||
                      $('[data-hook="rating-out-of-text"]').text()
    const ratingMatch = ratingText?.match(/(\d+\.?\d*)\s*(?:out of|stars?)/i)
    const starRating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

    // Extract total review count
    const reviewCountText = $('#acrCustomerReviewText').text() ||
                           $('[data-hook="total-review-count"]').text() ||
                           $('a[data-hook="see-all-reviews-link-foot"]').text()
    const reviewCountMatch = reviewCountText?.match(/([\d,]+)/)
    const totalReviewCount = reviewCountMatch 
      ? parseInt(reviewCountMatch[1].replace(/,/g, '')) 
      : undefined

    // Extract availability
    const availability = $('#availability span').text().trim() ||
                        $('#availability').text().trim() ||
                        'In Stock'

    // Extract product description
    const description = $('#productDescription p').text().trim() ||
                      $('#feature-bullets').text().trim() ||
                      $('.product-description').text().trim()

    // Extract key features
    const keyFeatures: string[] = []
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
      const feature = $(el).text().trim()
      if (feature && !feature.includes('Make sure')) {
        keyFeatures.push(feature)
      }
    })

    // Scrape reviews
    const reviews = await scrapeAmazonReviews(asin || productUrl)

    // Scrape Q&A
    const questions = await scrapeAmazonQandA(asin || productUrl)

    // If we still don't have a name, this might not be a valid product page
    if (!name || name.length < 3) {
      console.error('Could not extract product name - page might not be a valid product page')
      return null
    }

    // Ensure we have a valid Amazon URL (use ASIN-based URL if we found one)
    const finalAmazonUrl = asin 
      ? `https://www.amazon.com/dp/${asin}`
      : productUrl

    return {
      name: name.substring(0, 500),
      brand: brand?.substring(0, 100),
      price,
      currency,
      imageUrl,
      amazonUrl: finalAmazonUrl,
      asin: asin || undefined,
      starRating,
      totalReviewCount,
      availability,
      description: description?.substring(0, 2000),
      keyFeatures: keyFeatures.slice(0, 10),
      reviews,
      questions,
    }
  } catch (error) {
    console.error(`Error scraping Amazon product page:`, error)
    return null
  }
}

/**
 * Scrape Amazon reviews (Most Helpful and Most Recent)
 */
async function scrapeAmazonReviews(asinOrUrl: string): Promise<AmazonReview[]> {
  const reviews: AmazonReview[] = []
  
  try {
    // Extract ASIN
    const asinMatch = asinOrUrl.match(/([A-Z0-9]{10})/)
    const asin = asinMatch ? asinMatch[1] : null
    
    if (!asin) {
      return reviews
    }

    // Scrape Most Helpful reviews
    const helpfulUrl = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=1`
    const helpfulReviews = await scrapeReviewPage(helpfulUrl, 'most_helpful')
    reviews.push(...helpfulReviews.slice(0, 10))

    // Scrape Most Recent reviews (last 30 days)
    const recentUrl = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_arp_d_viewopt_sr?ie=UTF8&reviewerType=all_reviews&sortBy=recent&pageNumber=1&filterByStar=all_stars`
    const recentReviews = await scrapeReviewPage(recentUrl, 'most_recent')
    reviews.push(...recentReviews.slice(0, 10))

  } catch (error) {
    console.error('Error scraping Amazon reviews:', error)
  }

  return reviews
}

/**
 * Scrape a single review page
 */
async function scrapeReviewPage(url: string, reviewType: 'most_helpful' | 'most_recent'): Promise<AmazonReview[]> {
  const reviews: AmazonReview[] = []
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.amazon.com/',
      },
    })

    if (!response.ok) {
      console.warn(`Amazon review page returned ${response.status} ${response.statusText} for ${url}`)
      return reviews
    }

    const html = await response.text()
    
    // Check if Amazon blocked the request (common indicators)
    if (html.includes('captcha') || html.includes('robot') || html.includes('unusual traffic') || html.length < 1000) {
      console.warn(`Amazon may have blocked the request for ${url} (page too short or contains captcha indicators)`)
      return reviews
    }
    
    const $ = cheerio.load(html)

    // Try multiple selectors for reviews (Amazon changes their HTML structure)
    const reviewSelectors = [
      '[data-hook="review"]',
      '.a-section.review',
      '.review',
      '[id*="review"]',
    ]
    
    let foundReviews = false
    for (const selector of reviewSelectors) {
      const reviewElements = $(selector)
      if (reviewElements.length > 0) {
        foundReviews = true
        reviewElements.each((_, el) => {
          const $review = $(el)
          
          // Extract rating - try multiple selectors
          const ratingText = $review.find('[data-hook="review-star-rating"] .a-icon-alt').text() ||
                            $review.find('.a-icon-alt').first().text() ||
                            $review.find('[aria-label*="star"]').attr('aria-label') ||
                            $review.find('.a-star').attr('aria-label')
          const ratingMatch = ratingText?.match(/(\d+\.?\d*)\s*(?:out of|stars?)/i)
          const rating = ratingMatch ? Math.round(parseFloat(ratingMatch[1])) : undefined

          // Extract title - try multiple selectors
          const title = $review.find('[data-hook="review-title"] span').text().trim() ||
                       $review.find('.a-text-bold').first().text().trim() ||
                       $review.find('a[data-hook="review-title"]').text().trim()

          // Extract content - try multiple selectors
          const content = $review.find('[data-hook="review-body"] span').text().trim() ||
                         $review.find('.review-text').text().trim() ||
                         $review.find('[data-hook="review-body"]').text().trim()

          // Extract author - try multiple selectors
          const author = $review.find('.a-profile-name').text().trim() ||
                       $review.find('[data-hook="review-author"]').text().trim() ||
                       $review.find('.a-size-base.a-color-secondary').first().text().trim()

          // Extract date - try multiple selectors
          const dateText = $review.find('[data-hook="review-date"]').text() ||
                          $review.find('.a-size-base.a-color-secondary').last().text()
          const dateMatch = dateText?.match(/(\w+ \d+, \d+)/)
          const date = dateMatch ? new Date(dateMatch[1]) : undefined

          // Extract helpful count
          const helpfulText = $review.find('[data-hook="helpful-vote-statement"]').text()
          const helpfulMatch = helpfulText?.match(/(\d+)/)
          const helpful = helpfulMatch ? parseInt(helpfulMatch[1]) : undefined

          // Check if verified purchase
          const verified = $review.find('[data-hook="avp-badge"]').length > 0 ||
                          $review.text().includes('Verified Purchase') ||
                          $review.find('.a-size-mini.a-color-state.a-text-bold').text().includes('Verified')

          if (content && content.length > 10) {
            reviews.push({
              rating: rating || 5,
              title,
              content: content.substring(0, 2000),
              author,
              date,
              helpful,
              verified,
              reviewType,
            })
          }
        })
        break // Found reviews with this selector, no need to try others
      }
    }
    
    if (!foundReviews) {
      console.warn(`No review elements found on page ${url} - Amazon may have changed their HTML structure`)
    }
  } catch (error) {
    console.error('Error scraping review page:', error)
  }

  return reviews
}

/**
 * Scrape Amazon Q&A section
 */
async function scrapeAmazonQandA(asinOrUrl: string): Promise<AmazonQuestion[]> {
  const questions: AmazonQuestion[] = []
  
  try {
    // Extract ASIN
    const asinMatch = asinOrUrl.match(/([A-Z0-9]{10})/)
    const asin = asinMatch ? asinMatch[1] : null
    
    if (!asin) {
      return questions
    }

    const qaUrl = `https://www.amazon.com/ask/questions/asin/${asin}/1/ref=ask_dp_dpmw_ql_hza?isAnswered=true`
    
    const response = await fetch(qaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      return questions
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    $('.ask-question-text, .a-section.ask-question-text').each((_, el) => {
      const $qa = $(el)
      const question = $qa.find('.ask-question-text, .a-text-bold').first().text().trim()
      
      if (question) {
        // Try to find answer
        const answer = $qa.find('.ask-answer-text, .a-color-base').first().text().trim()
        const answerAuthor = $qa.find('.ask-answer-author, .a-color-secondary').first().text().trim()
        const helpfulText = $qa.find('[data-hook="helpful-vote-statement"]').text()
        const helpfulMatch = helpfulText?.match(/(\d+)/)
        const helpful = helpfulMatch ? parseInt(helpfulMatch[1]) : undefined

        questions.push({
          question: question.substring(0, 500),
          answer: answer ? answer.substring(0, 1000) : undefined,
          answerAuthor,
          helpful,
        })
      }
    })

    // Limit to top 10
    return questions.slice(0, 10)
  } catch (error) {
    console.error('Error scraping Amazon Q&A:', error)
    return questions
  }
}

/**
 * Extract themes and patterns from reviews
 */
export function extractReviewThemes(reviews: AmazonReview[]): {
  positiveThemes: string[]
  negativeThemes: string[]
  specificDetails: {
    skinTypes: string[]
    useCases: string[]
    timeframes: string[]
  }
  memorableQuotes: string[]
} {
  const positiveThemes: string[] = []
  const negativeThemes: string[] = []
  const skinTypes = new Set<string>()
  const useCases = new Set<string>()
  const timeframes = new Set<string>()
  const memorableQuotes: string[] = []

  // Keywords for positive themes
  const positiveKeywords = [
    'works', 'effective', 'great', 'love', 'amazing', 'perfect', 'excellent',
    'gentle', 'smooth', 'soft', 'hydrated', 'clear', 'improved', 'better',
    'no irritation', 'sensitive skin', 'doesn\'t break out', 'removes makeup',
    'affordable', 'worth it', 'repurchase', 'recommend'
  ]

  // Keywords for negative themes
  const negativeKeywords = [
    'doesn\'t work', 'waste', 'disappointed', 'bad', 'terrible', 'awful',
    'irritated', 'broke out', 'rash', 'burning', 'stinging', 'too expensive',
    'doesn\'t remove', 'leaks', 'bottle', 'packaging', 'smell', 'fragrance',
    'too strong', 'too weak', 'didn\'t see results', 'not worth it'
  ]

  // Track theme mentions
  const positiveThemeCounts: Record<string, number> = {}
  const negativeThemeCounts: Record<string, number> = {}

  for (const review of reviews) {
    const content = review.content.toLowerCase()
    const rating = review.rating || 0

    // Extract positive themes from 4-5 star reviews
    if (rating >= 4) {
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          positiveThemeCounts[keyword] = (positiveThemeCounts[keyword] || 0) + 1
        }
      }
    }

    // Extract negative themes from 1-2 star reviews
    if (rating <= 2) {
      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          negativeThemeCounts[keyword] = (negativeThemeCounts[keyword] || 0) + 1
        }
      }
    }

    // Extract skin types
    const skinTypePatterns = [
      /(sensitive|oily|dry|combination|normal|mature|acne-prone|rosacea)/gi
    ]
    for (const pattern of skinTypePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(m => skinTypes.add(m.toLowerCase()))
      }
    }

    // Extract use cases
    const useCasePatterns = [
      /(morning|night|evening|routine|double cleanse|travel|daily|weekly)/gi
    ]
    for (const pattern of useCasePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(m => useCases.add(m.toLowerCase()))
      }
    }

    // Extract timeframes
    const timeframePatterns = [
      /(immediately|right away|instantly|within \d+ (days?|weeks?|months?)|after \d+ (days?|weeks?|months?)|saw results|started working)/gi
    ]
    for (const pattern of timeframePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(m => timeframes.add(m.toLowerCase()))
      }
    }

    // Find memorable quotes (specific, colorful, not generic)
    if (review.content.length > 50 && review.content.length < 200) {
      const isGeneric = /(great product|love it|highly recommend|works well|amazing)/i.test(review.content)
      if (!isGeneric && (review.helpful || 0) > 5) {
        memorableQuotes.push(review.content.substring(0, 150))
      }
    }
  }

  // Get themes mentioned 5+ times
  const positiveThemesList = Object.entries(positiveThemeCounts)
    .filter(([_, count]) => count >= 5)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([theme, _]) => theme)

  const negativeThemesList = Object.entries(negativeThemeCounts)
    .filter(([_, count]) => count >= 5)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([theme, _]) => theme)

  return {
    positiveThemes: positiveThemesList,
    negativeThemes: negativeThemesList,
    specificDetails: {
      skinTypes: Array.from(skinTypes),
      useCases: Array.from(useCases),
      timeframes: Array.from(timeframes),
    },
    memorableQuotes: memorableQuotes.slice(0, 5),
  }
}

