/**
 * Amazon Movers & Shakers Collection Script
 * 
 * Scrapes Amazon's Movers & Shakers page for beauty products
 * that are trending (biggest sales jumps).
 * 
 * Note: Amazon's HTML structure may change. For production, consider:
 * 1. Using Amazon Product Advertising API (official, requires Associates account)
 * 2. Using a headless browser (Puppeteer/Playwright) for dynamic content
 * 3. Using a service like ScraperAPI or Bright Data
 */

import * as cheerio from 'cheerio'
import { prisma } from '../lib/prisma'

interface AmazonProduct {
  name: string
  brand?: string
  price?: number
  imageUrl?: string
  amazonUrl: string
  salesJumpPercent?: number // Sales rank jump as percentage (e.g., 1200 = 1200%)
  position?: number // Position on Movers & Shakers list (1, 2, 3, etc.)
  category?: string
}

/**
 * Scrape Amazon Movers & Shakers beauty section
 * 
 * Note: Amazon's HTML structure may change, so this may need updates
 */
async function fetchAmazonMoversAndShakers(): Promise<AmazonProduct[]> {
  // Define invalid patterns once at function scope
  const invalidPatterns = [
    /^green\s+up\s+arrow/i,
    /^increased\s*\d*\s*%?$/i,
    /^up\s+\d+\s*%?$/i,
    /^sales\s+rank/i,
    /^#\d+$/,
    /^moved\s+up/i,
    /^arrow/i,
  ]

  try {
    const url = 'https://www.amazon.com/gp/movers-and-shakers/beauty'
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch Amazon: ${response.statusText}`)
      return []
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const products: AmazonProduct[] = []

    // Debug: Log HTML length and check if we got content
    console.log(`📄 Fetched HTML: ${html.length} characters`)
    if (html.length < 1000) {
      console.warn('⚠️  HTML response seems too short - Amazon might be blocking or serving different content')
      return []
    }

    // Parse HTML using Cheerio
    // Amazon's structure varies, but we look for common patterns
    
    // First, try to find products by looking for numbered list items (#1, #2, etc.)
    // The Movers & Shakers page typically has products in a list format
    let position = 0
    
    // Method 1: Look for elements containing position numbers (#1, #2) AND sales data
    const potentialProducts = $('*').filter((_, el) => {
      const text = $(el).text()
      return /#\d+/.test(text) && (/increased|Sales rank/.test(text) || $(el).find('a[href*="/dp/"]').length > 0)
    })
    
    console.log(`🔍 Found ${potentialProducts.length} potential product containers`)
    
    // Method 1: Look for list items with position numbers
    potentialProducts.each((_, element) => {
      const $el = $(element)
      const text = $el.text()
      
      // Check if this element contains a position number (#1, #2, etc.)
      const positionMatch = text.match(/#(\d+)/)
      if (!positionMatch) return
      
      position = parseInt(positionMatch[1])
      
      // Try to find ASIN in data-asin attribute or in links
      let asin = $el.attr('data-asin')
      if (!asin) {
        const link = $el.find('a[href*="/dp/"]').first()
        const href = link.attr('href') || ''
        const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/)
        if (asinMatch) {
          asin = asinMatch[1]
        }
      }
      
      if (!asin || asin === '') return

      // Try to extract position from the element or nearby elements
      // Look for patterns like "#1", "#2", or numbered list items
      let extractedPosition: number | undefined = undefined
      const positionText = $el.text() + ' ' + ($el.parent().text() || '') + ' ' + ($el.siblings().first().text() || '')
      
      // Pattern 1: "#1", "#2", etc. in the text
      const hashMatch = positionText.match(/#(\d+)/)
      if (hashMatch) {
        extractedPosition = parseInt(hashMatch[1])
      }
      
      // Pattern 2: Look for numbered list items
      if (!extractedPosition) {
        const listItemMatch = $el.closest('li, div').text().match(/^(\d+)\./)
        if (listItemMatch) {
          extractedPosition = parseInt(listItemMatch[1])
        }
      }
      
      // If we couldn't extract position, use incremental counter
      position = extractedPosition || position + 1

      // Extract product name - try multiple selectors
      // Avoid UI elements like "Green up arrow, increased" or "increased X%"
      let name: string | null = $el.find('h2 a span, h2 span.a-text-normal').first().text().trim() ||
                 $el.find('.a-text-normal').first().text().trim() ||
                 $el.find('h2 a').first().text().trim() ||
                 $el.find('a.a-link-normal span').first().text().trim() ||
                 null
      
      // Check if name matches invalid patterns
      if (name) {
        const matchesInvalid = invalidPatterns.some(pattern => pattern.test(name!))
        if (matchesInvalid) {
          name = null // Reset to try other methods
        }
      }
      
      // If name looks like a price range, it's wrong - try to get from URL
      if (!name || name.match(/^\$[\d.,\s-]+$/)) {
        const url = $el.find('h2 a, a.a-link-normal').first().attr('href') || ''
        // Extract product name from URL path (e.g., /dp/B0C2Y2WWQM/ref=...)
        // Or try to get from title attribute
        name = $el.find('h2 a, a.a-link-normal').first().attr('title') || 
               $el.find('img').first().attr('alt') ||
               name
      }
      
      // Clean up name - remove price ranges if they got mixed in
      if (name && name.includes('$')) {
        // Try to extract just the product name part before any price
        const nameParts = name.split(/\$/)
        if (nameParts[0].trim().length > 3) {
          name = nameParts[0].trim()
        }
      }
      
      // Final validation: reject names that are clearly UI elements
      if (name) {
        const matchesInvalid = invalidPatterns.some(pattern => pattern.test(name!))
        if (matchesInvalid) {
          name = null
        }
      }
      
      // Extract price - look for price elements, not in the name
      const priceText = $el.find('.a-price .a-offscreen').first().text() ||
                       $el.find('.a-price-whole').first().text() ||
                       $el.find('.a-price').first().text()
      const priceMatch = priceText?.match(/\$?([\d,]+\.?\d*)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined
      
      // Extract image
      const imageUrl = $el.find('img').first().attr('src') || 
                      $el.find('img').first().attr('data-src')
      
      // Extract product URL
      const relativeUrl = $el.find('h2 a, a.a-link-normal').first().attr('href')
      const amazonUrl = relativeUrl 
        ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.amazon.com${relativeUrl}`)
        : `https://www.amazon.com/dp/${asin}`

      // If name is still a price, try to extract from URL
      if (!name || name.match(/^[\$0-9.,\s-]+$/)) {
        // Extract from URL path (e.g., /Product-Name-Here/dp/B0C2Y2WWQM)
        try {
          const urlObj = new URL(amazonUrl)
          const pathParts = urlObj.pathname.split('/').filter(p => p)
          const dpIndex = pathParts.findIndex(p => p === 'dp' || p.startsWith('dp'))
          
          if (dpIndex > 0) {
            const urlName = pathParts[dpIndex - 1]
            if (urlName && urlName.length > 3 && !urlName.match(/^[A-Z0-9]{10}$/)) {
              name = urlName
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
            }
          }
        } catch (e) {
          // URL parsing failed, keep original name
        }
      }

      // Extract brand (often in the product name or separate field)
      const brandMatch = name ? name.match(/^([A-Z][a-zA-Z\s&]+?)\s+/) : null
      const brand = brandMatch ? brandMatch[1].trim() : undefined

      // Extract sales jump percentage
      // Amazon shows this in various formats:
      // - "Up 1,200%" or "↑ 1,200%"
      // - "increased100%" or "increased 100%" (common on Movers & Shakers)
      // - "Sales rank: 1 (was 2)" - can calculate from rank change
      // - "#1 in Movers & Shakers" (implicit high rank)
      // - Look in multiple places: text content, data attributes, nearby spans
      let salesJumpPercent: number | undefined = undefined
      
      // Try multiple extraction methods
      const salesJumpText = $el.text() + ' ' + ($el.find('.a-text-normal, span').text() || '')
      
      // Pattern 1: "increased100%" or "increased 100%" (most common on Movers & Shakers)
      let percentMatch = salesJumpText.match(/increased\s*([\d,]+)\s*%/i)
      if (percentMatch) {
        salesJumpPercent = parseFloat(percentMatch[1].replace(/,/g, ''))
      }
      
      // Pattern 2: "Up 1,200%" or "↑ 1,200%"
      if (!salesJumpPercent) {
        percentMatch = salesJumpText.match(/(?:up|↑|moved|rank|#)\s*(?:#\s*)?([\d,]+)\s*%/i)
        if (percentMatch) {
          salesJumpPercent = parseFloat(percentMatch[1].replace(/,/g, ''))
        }
      }
      
      // Pattern 3: Calculate from sales rank change "Sales rank: 1 (was 2)"
      // Formula: ((was - current) / was) * 100 = percentage increase
      if (!salesJumpPercent) {
        const rankMatch = salesJumpText.match(/sales\s*rank[:\s]+(\d+)\s*\(was\s*(\d+)\)/i)
        if (rankMatch) {
          const currentRank = parseInt(rankMatch[1])
          const previousRank = parseInt(rankMatch[2])
          if (previousRank > currentRank && previousRank > 0) {
            // Better rank = lower number, so calculate improvement
            salesJumpPercent = Math.round(((previousRank - currentRank) / previousRank) * 100)
          }
        }
      }
      
      // Pattern 4: Look for percentage in parent/sibling elements
      if (!salesJumpPercent) {
        const parentText = $el.parent().text() + ' ' + $el.siblings().text()
        // Try "increased" format first
        percentMatch = parentText.match(/increased\s*([\d,]+)\s*%/i)
        if (percentMatch) {
          salesJumpPercent = parseFloat(percentMatch[1].replace(/,/g, ''))
        } else {
          // Fallback to other patterns
          percentMatch = parentText.match(/(?:up|↑|moved|rank)\s*([\d,]+)\s*%/i)
          if (percentMatch) {
            salesJumpPercent = parseFloat(percentMatch[1].replace(/,/g, ''))
          }
        }
      }
      
      // Pattern 3: If on Movers & Shakers page, being listed is significant
      // Give a base score even without specific percentage
      // We'll handle this in the scoring function

      // Skip if name is invalid, too short, or matches UI patterns
      if (name && 
          name.length > 3 && 
          !name.match(/^[\$0-9.,\s-]+$/) &&
          !invalidPatterns.some(pattern => pattern.test(name!))) {
        products.push({
          name: name.substring(0, 200), // Limit length
          brand,
          price,
          imageUrl,
          amazonUrl,
          salesJumpPercent,
          position, // Track position on Movers & Shakers list
          category: 'beauty',
        })
      }
    })

    // Method 2: Fallback to [data-asin] if Method 1 didn't find products
    if (products.length === 0) {
      console.log('Method 1 found 0 products, trying Method 2: [data-asin] elements')
      position = 0
      $('[data-asin]').each((_, element) => {
        const $el = $(element)
        const asin = $el.attr('data-asin')
        
        if (!asin || asin === '') return
        
        // Extract position from text if available
        const text = $el.text() + ' ' + ($el.parent().text() || '')
        const positionMatch = text.match(/#(\d+)/)
        if (positionMatch) {
          position = parseInt(positionMatch[1])
        } else {
          position++
        }
        
        // Use the same extraction logic as Method 1 (copy from above)
        // Extract product name
        // Avoid UI elements like "Green up arrow, increased" or "increased X%"
        let name: string | null = $el.find('h2 a span, h2 span.a-text-normal').first().text().trim() ||
                   $el.find('.a-text-normal').first().text().trim() ||
                   $el.find('h2 a').first().text().trim() ||
                   $el.find('a.a-link-normal span').first().text().trim() ||
                   null
        
        // Filter out common UI text that's not product names
        if (name) {
          const matchesInvalid = invalidPatterns.some(pattern => pattern.test(name!))
          if (matchesInvalid) {
            name = null
          }
        }
        
        if (!name || name.match(/^\$[\d.,\s-]+$/)) {
          name = $el.find('h2 a, a.a-link-normal').first().attr('title') || 
                 $el.find('img').first().attr('alt') ||
                 name
        }
        
        if (name && name.includes('$')) {
          const nameParts = name.split(/\$/)
          if (nameParts[0].trim().length > 3) {
            name = nameParts[0].trim()
          }
        }
        
        // Final validation: reject names that are clearly UI elements
        if (name) {
          const matchesInvalid = invalidPatterns.some(pattern => pattern.test(name!))
          if (matchesInvalid) {
            name = null
          }
        }
        
        // Extract price
        const priceText = $el.find('.a-price .a-offscreen').first().text() ||
                         $el.find('.a-price-whole').first().text() ||
                         $el.find('.a-price').first().text()
        const priceMatch = priceText?.match(/\$?([\d,]+\.?\d*)/)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined
        
        // Extract image
        const imageUrl = $el.find('img').first().attr('src') || 
                        $el.find('img').first().attr('data-src')
        
        // Extract product URL
        const relativeUrl = $el.find('h2 a, a.a-link-normal').first().attr('href')
        const amazonUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.amazon.com${relativeUrl}`)
          : `https://www.amazon.com/dp/${asin}`
        
        // Extract brand
        const brandMatch = name ? name.match(/^([A-Z][a-zA-Z\s&]+?)\s+/) : null
        const brand = brandMatch ? brandMatch[1].trim() : undefined
        
        // Extract sales jump percentage
        const salesJumpText = $el.text() + ' ' + ($el.find('.a-text-normal, span').text() || '')
        let salesJumpPercent: number | undefined = undefined
        
        let percentMatch = salesJumpText.match(/increased\s*([\d,]+)\s*%/i)
        if (percentMatch) {
          salesJumpPercent = parseFloat(percentMatch[1].replace(/,/g, ''))
        }
        
        if (!salesJumpPercent) {
          const rankMatch = salesJumpText.match(/sales\s*rank[:\s]+(\d+)\s*\(was\s*(\d+)\)/i)
          if (rankMatch) {
            const currentRank = parseInt(rankMatch[1])
            const previousRank = parseInt(rankMatch[2])
            if (previousRank > currentRank && previousRank > 0) {
              salesJumpPercent = Math.round(((previousRank - currentRank) / previousRank) * 100)
            }
          }
        }
        
        // Skip if name is invalid, too short, or matches UI patterns
        if (name && 
            name.length > 3 && 
            !name.match(/^[\$0-9.,\s-]+$/) &&
            !invalidPatterns.some(pattern => pattern.test(name!))) {
          products.push({
            name: name.substring(0, 200),
            brand,
            price,
            imageUrl,
            amazonUrl,
            salesJumpPercent,
            position,
            category: 'beauty',
          })
        }
      })
    }
    
    // Method 3: Last resort - find all /dp/ links
    if (products.length === 0) {
      console.log('Method 2 found 0 products, trying Method 3: all /dp/ links')
      position = 0
      $('a[href*="/dp/"]').each((_, element) => {
        const $el = $(element)
        const href = $el.attr('href')
        if (!href) return

        const fullUrl = href.startsWith('http') 
          ? href 
          : `https://www.amazon.com${href}`
        
        const asinMatch = fullUrl.match(/\/dp\/([A-Z0-9]{10})/)
        if (asinMatch) {
          const name = $el.text().trim() || $el.find('span').first().text().trim()
          
          // Final validation - reject UI elements
          const invalidPatterns = [
            /^green\s+up\s+arrow/i,
            /^increased\s*\d*\s*%?$/i,
            /^up\s+\d+\s*%?$/i,
            /^sales\s+rank/i,
            /^#\d+$/,
            /^moved\s+up/i,
            /^arrow/i,
          ]
          
          if (name && 
              name.length > 3 && 
              !name.match(/^[\$0-9.,\s-]+$/) &&
              !invalidPatterns.some(pattern => pattern.test(name))) {
            position++
            products.push({
              name,
              amazonUrl: fullUrl,
              position,
              category: 'beauty',
            })
          }
        }
      })
    }
    
    console.log(`After all methods: Found ${products.length} products`)

    // Remove duplicates based on ASIN
    const uniqueProducts = new Map<string, AmazonProduct>()
    for (const product of products) {
      const asinMatch = product.amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
      if (asinMatch) {
        const asin = asinMatch[1]
        if (!uniqueProducts.has(asin)) {
          uniqueProducts.set(asin, product)
        }
      }
    }

    console.log(`✅ Found ${uniqueProducts.size} unique products on Amazon Movers & Shakers`)
    
    // Log sample of what we found
    if (uniqueProducts.size > 0) {
      console.log('\n📋 Sample products found:')
      Array.from(uniqueProducts.values()).slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name?.substring(0, 50)}... (Pos: ${p.position || 'N/A'}, Jump: ${p.salesJumpPercent || 'N/A'}%)`)
      })
    }
    
    // Limit to 30 products - enough to get good variety but not overwhelming
    return Array.from(uniqueProducts.values()).slice(0, 30)
  } catch (error) {
    console.error('Error fetching Amazon Movers & Shakers:', error)
    return []
  }
}

/**
 * Calculate trend score for Amazon products
 * Movers & Shakers = products with biggest sales rank jumps (shown as %)
 * 
 * NEW Scoring: Percentage ÷ 20 = points (capped at 70)
 * - 1,400%+ increase = 70 points
 * - 800% increase = 40 points
 * - 400% increase = 20 points
 * - 200% increase = 10 points
 */
function calculateAmazonTrendScore(salesJumpPercent?: number): number {
  // Products on Amazon Movers & Shakers are TRULY VIRAL
  // They get a base score of 100 to ensure they dominate "Trending Now"
  // This creates a clear hierarchy:
  // - "Trending Now" (70+) = Amazon M&S products (start at 100, decay over time)
  // - "Rising Fast" (50-69) = Reddit buzz products NOT on M&S
  
  if (!salesJumpPercent || salesJumpPercent <= 0) {
    // Even without specific sales jump %, being on M&S means it's viral
    return 100
  }
  
  // All M&S products start at 100 points
  // With age decay, they'll stay in "Trending Now" for 5-7 days
  return 100
}

/**
 * Process Amazon data and store in database
 */
async function processAmazonData() {
  console.log('Starting Amazon Movers & Shakers collection...\n')

  const products = await fetchAmazonMoversAndShakers()
  console.log(`Found ${products.length} products\n`)

  // Log first few products for debugging
  if (products.length > 0) {
    console.log('Sample products found:')
    products.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name?.substring(0, 60)}... (Position: ${p.position || 'N/A'}, Sales Jump: ${p.salesJumpPercent || 'N/A'}%)`)
    })
    console.log()
  }

  // Track which products are currently on M&S (by ASIN for reliable matching)
  // Extract ASINs from URLs to handle query parameter variations
  const extractASIN = (url: string | undefined): string | null => {
    if (!url) return null
    const match = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/gp\/product\/([A-Z0-9]{10})/)
    return match ? match[1] : null
  }
  
  const currentMoversShakersASINs = new Set(
    products
      .map(p => extractASIN(p.amazonUrl))
      .filter((asin): asin is string => asin !== null)
  )

  let stored = 0
  let updated = 0
  let skipped = 0

  for (const product of products) {
    if (!product.name || product.name.includes('Amazon Product')) {
      skipped++
      if (skipped <= 3) {
        console.log(`⚠️  Skipping product with invalid name: "${product.name?.substring(0, 50)}..."`)
      }
      continue // Skip if we don't have a real product name
    }

    const trendScore = calculateAmazonTrendScore(product.salesJumpPercent)

    try {
      // Extract ASIN from product URL for reliable matching
      const productASIN = extractASIN(product.amazonUrl)
      
      // Check if product exists by ASIN (handles query parameter variations)
      let existing = null
      if (productASIN) {
        // Find all products with this ASIN
        const productsWithASIN = await prisma.product.findMany({
          where: {
            amazonUrl: { contains: productASIN },
          },
        })
        
        // If multiple found, prefer PUBLISHED, then on M&S, then first one
        if (productsWithASIN.length > 0) {
          const published = productsWithASIN.find(p => p.status === 'PUBLISHED')
          const onMS = productsWithASIN.find(p => p.onMoversShakers === true)
          existing = published || onMS || productsWithASIN[0]
          
          // If we found multiple, merge the others into this one
          if (productsWithASIN.length > 1) {
            const duplicates = productsWithASIN.filter(p => p.id !== existing!.id)
            for (const dup of duplicates) {
              // Transfer signals
              await prisma.trendSignal.updateMany({
                where: { productId: dup.id },
                data: { productId: existing!.id },
              })
              
              // Transfer reviews
              await prisma.review.updateMany({
                where: { productId: dup.id },
                data: { productId: existing!.id },
              })
              
              // Transfer content if existing doesn't have it
              const dupContent = await prisma.productContent.findUnique({
                where: { productId: dup.id },
              })
              const existingContent = await prisma.productContent.findUnique({
                where: { productId: existing!.id },
              })
              
              if (dupContent && !existingContent) {
                await prisma.productContent.update({
                  where: { id: dupContent.id },
                  data: { productId: existing!.id },
                })
              } else if (dupContent && existingContent && dupContent.slug && dupContent.slug !== existingContent.slug) {
                // Merge slugs into previousSlugs
                const previousSlugs = (existingContent.previousSlugs as string[]) || []
                if (!previousSlugs.includes(dupContent.slug)) {
                  previousSlugs.push(dupContent.slug)
                  await prisma.productContent.update({
                    where: { id: existingContent.id },
                    data: { previousSlugs },
                  })
                }
              }
              
              // Delete duplicate
              await prisma.product.delete({ where: { id: dup.id } })
            }
          }
        }
      }
      
      // Fallback: if ASIN matching didn't work, try exact URL match
      if (!existing) {
        existing = await prisma.product.findFirst({
          where: {
            amazonUrl: product.amazonUrl,
          },
        })
      }

      if (existing) {
        // Recalculate total score (Amazon + Reddit)
        const allSignals = await prisma.trendSignal.findMany({
          where: { productId: existing.id },
        })
        
        // Calculate Amazon score (70 points max)
        let amazonScore = 0
        for (const signal of allSignals) {
          if (signal.source === 'amazon_movers') {
            const metadata = signal.metadata as any
            const salesJump = signal.value || metadata?.salesJumpPercent || 0
            if (salesJump > 0) {
              const calculatedScore = Math.min(70, Math.floor(salesJump / 20))
              // Give at least 10 points for being on Movers & Shakers, even with low percentages
              amazonScore = Math.max(10, calculatedScore)
              break // Use highest Amazon score
            } else {
              amazonScore = 10 // Base score
            }
          }
        }
        // Use the new Amazon score if higher (ensure minimum 10)
        amazonScore = Math.max(10, Math.max(amazonScore, trendScore))
        
        // Calculate Reddit bonus score (30 points max)
        const redditSignals = allSignals.filter(s => s.source === 'reddit_skincare')
        let redditScore = 0
        const sortedReddit = redditSignals
          .sort((a, b) => (b.value || 0) - (a.value || 0))
        
        let highEngagementCount = 0
        for (const signal of sortedReddit) {
          const upvotes = signal.value || 0
          if (upvotes > 500 && highEngagementCount < 2) {
            redditScore += 20
            highEngagementCount++
          } else if (upvotes >= 300 && highEngagementCount < 2) {
            redditScore += 15
            highEngagementCount++
          }
        }
        if (redditSignals.length >= 3) {
          redditScore += 10
        } else if (redditSignals.length >= 2) {
          redditScore += 5
        }
        redditScore = Math.min(30, redditScore) // Cap at 30
        
        // Total score = Amazon (0-70) + Reddit bonus (0-30) = max 100
        const totalScore = amazonScore + redditScore

        // Import setFirstDetected function
        const { setFirstDetected } = await import('../lib/trending-products')

        // Update existing product - mark as currently on M&S
        // If product was already on M&S before, don't reset baseScore to 100
        // Instead, boost it if the new score is higher, but don't reset if it was already trending
        const shouldResetBaseScore = !existing.onMoversShakers || existing.baseScore === null || existing.baseScore < 50
        const newBaseScore = shouldResetBaseScore ? totalScore : Math.max(existing.baseScore || 0, totalScore)
        
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            trendScore: Math.max(existing.trendScore, totalScore),
            price: product.price || existing.price,
            imageUrl: product.imageUrl || existing.imageUrl,
            onMoversShakers: true, // Mark as currently on M&S
            lastSeenOnMoversShakers: new Date(), // Update last seen timestamp
          },
        })

        // Update age decay fields (set firstDetected if new, update baseScore)
        // Pass the new baseScore to setFirstDetected, which will handle the update
        await setFirstDetected(existing.id, newBaseScore)

        // Check if we already have a recent Amazon signal for this product (within last 24 hours)
        const recentSignal = await prisma.trendSignal.findFirst({
          where: {
            productId: existing.id,
            source: 'amazon_movers',
            detectedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        })

        // Only create a new signal if we don't have a recent one, or if the new one has a higher sales jump
        if (!recentSignal || (product.salesJumpPercent || 0) > (recentSignal.value || 0)) {
          // If we have an old signal with lower value, delete it
          if (recentSignal && (product.salesJumpPercent || 0) > (recentSignal.value || 0)) {
            await prisma.trendSignal.delete({
              where: { id: recentSignal.id },
            })
          }
          
          // Create new signal
          await prisma.trendSignal.create({
            data: {
              productId: existing.id,
              source: 'amazon_movers',
              signalType: 'sales_spike',
              value: product.salesJumpPercent || null, // Store sales jump % as value
              metadata: {
                category: product.category,
                salesJumpPercent: product.salesJumpPercent,
                position: product.position, // Store position on list
                previousPosition: (recentSignal?.metadata as any)?.position || null, // Track position change
                detectedAt: new Date().toISOString(),
              },
            },
          })
        } else {
          // Update existing signal's detectedAt and position to keep it fresh
          await prisma.trendSignal.update({
            where: { id: recentSignal.id },
            data: {
              detectedAt: new Date(),
              metadata: {
                ...(recentSignal.metadata as any || {}),
                position: product.position, // Update position
                previousPosition: (recentSignal.metadata as any)?.position || null,
              },
            },
          })
        }

        updated++
      } else {
        // Before creating, check if we have a Reddit product with similar name
        // This enriches Amazon products with Reddit data even if we didn't search Reddit
        // But first, check if the Reddit product already has an Amazon URL with the same ASIN
        let redditMatch = null
        if (productASIN) {
          const redditWithASIN = await prisma.product.findFirst({
            where: {
              amazonUrl: { contains: productASIN },
              trendSignals: {
                some: {
                  source: 'reddit_skincare',
                },
              },
            },
            include: {
              trendSignals: true,
            },
          })
          if (redditWithASIN) {
            redditMatch = redditWithASIN
          }
        }
        
        // If no ASIN match, try name/brand matching
        if (!redditMatch) {
          redditMatch = await findMatchingRedditProduct(product.name, product.brand)
        }
        
        if (redditMatch) {
          // Recalculate total score (Amazon + Reddit)
          const allSignals = await prisma.trendSignal.findMany({
            where: { productId: redditMatch.id },
          })
          
          // Calculate Amazon score (50 points max)
          const amazonScore = Math.min(50, Math.floor((product.salesJumpPercent || 0) / 30))
          
          // Calculate Reddit score (50 points max)
          const redditSignals = allSignals
            .filter(s => s.source === 'reddit_skincare' && (s.value || 0) > 300)
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .slice(0, 2) // Max 2 posts
          const redditScore = Math.min(50, redditSignals.length * 25)
          
          // Total score = Amazon + Reddit (max 100)
          const totalScore = amazonScore + redditScore
          
          // Import setFirstDetected function
          const { setFirstDetected } = await import('../lib/trending-products')
          
          // Update existing Reddit product with Amazon data
          await prisma.product.update({
            where: { id: redditMatch.id },
            data: {
              amazonUrl: product.amazonUrl,
              price: product.price || redditMatch.price,
              imageUrl: product.imageUrl || redditMatch.imageUrl,
              brand: product.brand || redditMatch.brand,
              trendScore: Math.max(redditMatch.trendScore, totalScore),
            },
          })

          // Update age decay fields
          await setFirstDetected(redditMatch.id, totalScore)

          // Add Amazon trend signal to Reddit product
          await prisma.trendSignal.create({
            data: {
              productId: redditMatch.id,
              source: 'amazon_movers',
              signalType: 'sales_spike',
              value: product.salesJumpPercent || null,
              metadata: {
                category: product.category,
                salesJumpPercent: product.salesJumpPercent,
                position: product.position,
                detectedAt: new Date().toISOString(),
              },
            },
          })

          updated++
        } else {
          // Create new product
          // Import setFirstDetected function
          const { setFirstDetected } = await import('../lib/trending-products')
          
          const newProduct = await prisma.product.create({
            data: {
              name: product.name,
              brand: product.brand,
              price: product.price,
              imageUrl: product.imageUrl,
              amazonUrl: product.amazonUrl,
              category: product.category || 'beauty',
              trendScore: trendScore, // Store calculated score (will be combined with Reddit during enrichment)
              status: trendScore >= 60 ? 'FLAGGED' : 'DRAFT', // Flag if score >= 60, otherwise draft
              onMoversShakers: true, // Mark as currently on M&S
              lastSeenOnMoversShakers: new Date(), // Set initial timestamp
            },
          })

          // Set first_detected and initialize age decay fields
          await setFirstDetected(newProduct.id, trendScore)

          // Add trend signal
          await prisma.trendSignal.create({
            data: {
              productId: newProduct.id,
              source: 'amazon_movers',
              signalType: 'sales_spike',
              value: product.salesJumpPercent || null, // Store sales jump % as value
              metadata: {
                category: product.category,
                salesJumpPercent: product.salesJumpPercent,
                position: product.position,
                detectedAt: new Date().toISOString(),
              },
            },
          })

          stored++
        }
      }
    } catch (error) {
      console.error(`Error processing ${product.name}:`, error)
    }
  }

  console.log(`\n✅ Amazon collection complete!`)
  console.log(`   - Stored: ${stored} new products`)
  console.log(`   - Updated: ${updated} existing products`)
  console.log(`   - Skipped: ${skipped} products (invalid names)`)
  console.log(`   - Products with score > 60 are flagged for review generation`)
  
  // Invalidate cache after all product updates
  console.log(`\n🔄 Invalidating homepage cache...`)
  try {
    const revalidateUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/revalidate`
        : 'http://localhost:3000/api/revalidate'
    await fetch(revalidateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['products', 'trending', 'rising', 'recent', 'new', 'peak-viral', 'warming'],
        paths: ['/', '/trending'],
      }),
    })
    console.log(`   ✅ Cache invalidated successfully`)
  } catch (error) {
    console.warn(`   ⚠️  Cache invalidation failed (non-critical):`, error)
  }

  // Mark products that are NO LONGER on Movers & Shakers
  console.log(`\n🔄 Checking for products that dropped off Movers & Shakers...`)
  
  const productsOnMS = await prisma.product.findMany({
    where: {
      onMoversShakers: true, // Currently marked as on M&S
    },
    select: {
      id: true,
      name: true,
      amazonUrl: true,
      baseScore: true,
      firstDetected: true,
      createdAt: true, // Include createdAt for trending calculation
    },
  })

  let droppedOff = 0
  const { calculateCurrentScore } = await import('../lib/age-decay')

  for (const product of productsOnMS) {
    // If product is not in current M&S list, mark it as dropped off
    // Use ASIN matching instead of exact URL to handle query parameter variations
    const productASIN = extractASIN(product.amazonUrl || '')
    if (!productASIN || !currentMoversShakersASINs.has(productASIN)) {
      // Reduce base score by 10-15 points instead of dropping to 50
      // This prevents huge daily swings (100 → 50 in one day)
      // Products will gradually decay to zero over time, but not instantly
      const currentBaseScore = product.baseScore || 100
      const reduction = Math.min(15, Math.max(10, Math.floor(currentBaseScore * 0.12))) // 10-15 points or 12% of current score
      const newBaseScore = Math.max(0, currentBaseScore - reduction) // Can go to zero over time, just not instantly
      
      // Get current pageViews and clicks for traffic boost calculation
      const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        // @ts-ignore - pageViews and clicks will be available after migration
        select: { pageViews: true, clicks: true, createdAt: true },
      })
      
      // Calculate with faster decay since product dropped off M&S
      // Use createdAt for trending calculation (how long product has been tracked, not just on M&S)
      const result = calculateCurrentScore(
        newBaseScore, 
        product.firstDetected,
        // @ts-ignore - pageViews and clicks will be available after migration
        fullProduct?.pageViews,
        // @ts-ignore
        fullProduct?.clicks,
        true, // droppedOffMS = true for faster decay
        product.createdAt || fullProduct?.createdAt || product.firstDetected // Use createdAt for trending calculation
      )
      
      // No minimum score - products can decay to zero over time
      const finalScore = result.currentScore

      await prisma.product.update({
        where: { id: product.id },
        data: {
          onMoversShakers: false, // No longer on M&S
          baseScore: newBaseScore, // Reduced by 10-15 points
          currentScore: finalScore, // Recalculate with age decay and traffic boost, min 50
          trendScore: finalScore, // Update legacy score
        },
      })
      
      // Invalidate cache via API endpoint (scripts can't directly call revalidateTag)
      try {
        const revalidateUrl = process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`
          : 'http://localhost:3000/api/revalidate'
        await fetch(revalidateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tags: ['products', 'trending', 'rising', 'recent'],
            paths: ['/', '/trending'],
          }),
        }).catch(() => {
          // Silently fail if revalidation endpoint is not available (e.g., in scripts)
        })
      } catch (error) {
        // Non-critical, continue even if cache invalidation fails
      }

      console.log(`  ⬇️  ${product.name.substring(0, 50)} dropped off M&S (${currentBaseScore} → ${newBaseScore} base score, current: ${finalScore})`)
      droppedOff++
    }
  }

  if (droppedOff > 0) {
    console.log(`\n📉 ${droppedOff} products dropped off Movers & Shakers (score reduced by 10-15 points, will decay gradually to zero)`)
  } else {
    console.log(`\n✅ All previously tracked M&S products are still on the list`)
  }
}

/**
 * Find a Reddit product that matches an Amazon product by name
 * This allows us to merge Amazon data into existing Reddit products
 */
async function findMatchingRedditProduct(amazonProductName: string, amazonBrand?: string) {
  try {
    const normalize = (name: string) => 
      name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '')
    
    const normalizedName = normalize(amazonProductName)
    
    // Look for Reddit products (those with Reddit signals but no Amazon URL)
    const redditProducts = await prisma.product.findMany({
      where: {
        amazonUrl: null, // No Amazon URL yet
        trendSignals: {
          some: {
            source: 'reddit_skincare',
          },
        },
      },
      include: {
        trendSignals: true,
      },
    })

    // Find best match by name similarity
    let bestMatch: typeof redditProducts[0] | null = null
    let bestScore = 0

    for (const redditProduct of redditProducts) {
      const redditNormalized = normalize(redditProduct.name)
      
      // Calculate similarity
      const words1 = new Set(normalizedName.split(/\s+/))
      const words2 = new Set(redditNormalized.split(/\s+/))
      const intersection = new Set([...words1].filter(x => words2.has(x)))
      const union = new Set([...words1, ...words2])
      const similarity = intersection.size / union.size
      
      // Bonus for brand match
      let finalSimilarity = similarity
      if (amazonBrand && redditProduct.brand) {
        const brandMatch = normalize(amazonBrand) === normalize(redditProduct.brand)
        if (brandMatch) {
          finalSimilarity = Math.min(1.0, similarity + 0.2) // Boost similarity if brands match
        }
      }
      
      if (finalSimilarity > bestScore && finalSimilarity > 0.5) { // 50% similarity threshold
        bestScore = finalSimilarity
        bestMatch = redditProduct
      }
      
    }

    return bestMatch
  } catch (error) {
    console.error('Error finding matching Reddit product:', error)
    return null
  }
}

export { processAmazonData }

// Run if called directly
if (require.main === module) {
  processAmazonData()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

