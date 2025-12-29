/**
 * Search Amazon for a specific product
 * 
 * This searches Amazon for products matching a product name
 * and returns the best match with Amazon URL, price, image, etc.
 * 
 * Uses PA-API first (if configured), then falls back to scraping
 */

import * as cheerio from 'cheerio'
import { searchAmazonWithPAAPI, convertPAAPIItemToResult } from './amazon-paapi'

export interface AmazonSearchResult {
  name: string
  brand?: string
  price?: number
  imageUrl?: string
  amazonUrl: string
  salesJumpPercent?: number
  rating?: number
  reviewCount?: number
}

/**
 * Get PA-API credentials from environment variables
 */
function getPAAPICredentials(): { accessKey: string; secretKey: string; partnerTag: string } | null {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY
  const partnerTag = process.env.AMAZON_PAAPI_PARTNER_TAG || process.env.AMAZON_ASSOCIATE_TAG

  if (!accessKey || !secretKey || !partnerTag) {
    return null
  }

  return { accessKey, secretKey, partnerTag }
}

/**
 * Search Amazon for a product by name
 * Tries PA-API first (if configured), then falls back to scraping
 */
export async function searchAmazonProduct(productName: string): Promise<AmazonSearchResult | null> {
  // Try PA-API first if credentials are configured
  const paapiCreds = getPAAPICredentials()
  if (paapiCreds) {
    try {
      const items = await searchAmazonWithPAAPI(productName, {
        accessKey: paapiCreds.accessKey,
        secretKey: paapiCreds.secretKey,
        partnerTag: paapiCreds.partnerTag,
        partnerType: 'Associates',
        marketplace: 'www.amazon.com',
      })

      if (items && items.length > 0) {
        // Return the first (best) match
        const result = convertPAAPIItemToResult(items[0], paapiCreds.partnerTag)
        console.log(`✅ PA-API found: ${result.name}`)
        return result
      }
    } catch (error) {
      console.warn('PA-API search failed, falling back to scraping:', error)
      // Fall through to scraping fallback
    }
  }

  // Fallback to scraping if PA-API not available or failed
  // Try multiple search strategies
  const searchStrategies = [
    productName, // Original full name
    productName.replace(/\s+/g, ' ').trim(), // Normalized spacing
  ]

  // If product name has multiple words, try brand + key product word
  const words = productName.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 2) {
    // Try first word (likely brand) + last word (likely product name)
    searchStrategies.push(`${words[0]} ${words[words.length - 1]}`)
    // Try first two words (likely brand)
    if (words.length >= 3) {
      searchStrategies.push(`${words[0]} ${words[1]}`)
    }
  }

  // Try each search strategy
  for (const searchQuery of searchStrategies) {
    const result = await tryAmazonSearch(searchQuery)
    if (result) {
      return result
    }
  }

  return null
}

/**
 * Try a single Amazon search query
 */
async function tryAmazonSearch(searchQuery: string): Promise<AmazonSearchResult | null> {
  try {
    // Clean product name for search
    const cleanedQuery = searchQuery
      .replace(/\s+/g, '+')
      .replace(/[^\w\s+-]/g, '')
      .substring(0, 100) // Limit query length
    
    // Try beauty category first, then all products
    const categories = ['beauty', 'all']
    
    for (const category of categories) {
      const searchUrl = category === 'all' 
        ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanedQuery)}`
        : `https://www.amazon.com/s?k=${encodeURIComponent(cleanedQuery)}&i=${category}`
      
      try {
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.amazon.com/',
          },
        })

        if (!response.ok) {
          continue // Try next category
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Find the first product result
        // Amazon search results are in divs with data-asin
        const firstProduct = $('[data-asin]').not('[data-asin=""]').first()
        
        if (firstProduct.length === 0) {
          continue // Try next category
        }

        const asin = firstProduct.attr('data-asin')
        if (!asin || asin === '' || asin.length < 10) {
          continue // Try next category
        }

        // Extract product name - try multiple selectors (avoid rating text)
        const nameSelectors = [
          'h2 a span.a-text-normal',
          'h2 span.a-text-normal',
          'h2 a span',
          'h2 a',
          'span[data-component-type="s-product-image"] + div h2 a span',
        ]
        
        let name = ''
        for (const selector of nameSelectors) {
          const found = firstProduct.find(selector).first().text().trim()
          // Filter out rating patterns and ensure it's a real product name
          if (found && found.length >= 3) {
            // Skip if it's just a rating number
            if (found.match(/^\d+\.?\d*$/)) continue
            // Skip if it contains rating text
            if (found.match(/^\d+\.?\d*\s*(out of|stars?|rating)/i)) continue
            // Skip if it's too short or looks like metadata
            if (found.length < 5 && found.match(/^\d+/)) continue
            
            name = found
            break
          }
        }

        // If we still don't have a name, try getting text from the h2 element directly
        // and extract the first meaningful part (before rating/review info)
        if (!name || name.length < 3) {
          const h2Element = firstProduct.find('h2').first()
          const h2Text = h2Element.text().trim()
          
          // Try to find the link text first (most reliable)
          const linkText = h2Element.find('a').first().text().trim()
          if (linkText && linkText.length >= 3 && !linkText.match(/^\d+\.?\d*$/)) {
            name = linkText
          } else {
            // Split by common separators and take the first meaningful part
            const parts = h2Text.split(/[•|·\n]/)
            for (const part of parts) {
              const cleaned = part.trim()
              // Must be at least 5 chars, not a number, and not rating text
              if (cleaned.length >= 5 && 
                  !cleaned.match(/^\d+\.?\d*$/) && 
                  !cleaned.match(/^\d+\.?\d*\s*(out of|stars?|rating)/i) &&
                  !cleaned.match(/^[\d,]+$/)) { // Not just numbers/commas
                name = cleaned
                break
              }
            }
          }
        }

        // Final validation - ensure name is valid
        if (!name || name.length < 3 || name.match(/^\d+\.?\d*$/)) {
          console.warn(`Could not extract valid product name from Amazon search result. Found: "${name}"`)
          continue // Try next category
        }

        // Extract price
        const priceText = firstProduct.find('.a-price .a-offscreen').first().text() ||
                         firstProduct.find('.a-price-whole').first().text() ||
                         firstProduct.find('.a-price-symbol + .a-price-whole').first().text()
        const priceMatch = priceText?.match(/\$?([\d,]+\.?\d*)/)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined

        // Extract image - try multiple attributes
        const imageUrl = firstProduct.find('img').first().attr('src') || 
                        firstProduct.find('img').first().attr('data-src') ||
                        firstProduct.find('img').first().attr('data-lazy-src')

        // Extract rating
        const ratingText = firstProduct.find('.a-icon-alt').first().text() || ''
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

        // Extract review count
        const reviewText = firstProduct.find('.a-size-base, .a-link-normal').text() || ''
        const reviewMatch = reviewText.match(/([\d,]+)/)
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : undefined

        // Extract product URL
        const relativeUrl = firstProduct.find('h2 a, a.a-link-normal').first().attr('href')
        const amazonUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.amazon.com${relativeUrl.split('?')[0]}`)
          : `https://www.amazon.com/dp/${asin}`

        // Extract brand - try to find it in the name
        const brandMatch = name.match(/^([A-Z][a-zA-Z\s&]+?)\s+/)
        const brand = brandMatch ? brandMatch[1].trim() : undefined

        return {
          name: name.substring(0, 200),
          brand,
          price,
          imageUrl,
          amazonUrl,
          rating,
          reviewCount,
        }
      } catch (error) {
        // Continue to next category
        continue
      }
    }

    return null
  } catch (error) {
    console.error(`Error searching Amazon for "${searchQuery}":`, error)
    return null
  }
}


