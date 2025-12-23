/**
 * Utility to get Amazon product image from URL
 * Extracts image URL from Amazon product page or uses ASIN to construct image URL
 */

/**
 * Get product image from Amazon URL
 * Tries multiple methods to extract or construct the image URL
 */
export function getAmazonImageUrl(amazonUrl: string | null | undefined): string | null {
  if (!amazonUrl) return null
  
  try {
    // Method 1: Extract ASIN and construct image URL
    // Amazon images are typically: https://m.media-amazon.com/images/I/[IMAGE_ID]._AC_SL1500_.jpg
    // But we can use: https://images-na.ssl-images-amazon.com/images/P/[ASIN].01._SCLZZZZZZZ_.jpg
    
    const asinMatch = amazonUrl.match(/\/dp\/([A-Z0-9]{10})/) || 
                     amazonUrl.match(/\/gp\/product\/([A-Z0-9]{10})/) ||
                     amazonUrl.match(/\/product\/([A-Z0-9]{10})/)
    
    if (asinMatch && asinMatch[1]) {
      const asin = asinMatch[1]
      // Amazon image URL format - using ASIN directly
      // This format works for most products: https://m.media-amazon.com/images/I/[ASIN]._AC_SL1500_.jpg
      // But we need to use the actual image ID, not ASIN. So we'll use a different approach.
      // Try the legacy format which uses ASIN: https://images-na.ssl-images-amazon.com/images/P/[ASIN].01._SCLZZZZZZZ_.jpg
      return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Fetch actual image URL from Amazon product page
 * This is a fallback if the constructed URL doesn't work
 */
export async function fetchAmazonImageFromUrl(amazonUrl: string): Promise<string | null> {
  try {
    const response = await fetch(amazonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    
    if (!response.ok) return null
    
    const html = await response.text()
    
    // Try to find the main product image in the HTML
    // Amazon uses various selectors for the main product image
    const imagePatterns = [
      /id="landingImage"[^>]+src="([^"]+)"/,
      /data-a-dynamic-image='([^']+)'/,
      /"mainImage":\s*"([^"]+)"/,
      /id="imgBlkFront"[^>]+src="([^"]+)"/,
    ]
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        let imageUrl = match[1]
        // Clean up the URL
        imageUrl = imageUrl.replace(/\\u002F/g, '/')
        imageUrl = imageUrl.replace(/\\"/g, '"')
        
        // If it's a JSON string, parse it
        if (imageUrl.startsWith('{')) {
          try {
            const parsed = JSON.parse(imageUrl)
            if (parsed && typeof parsed === 'object') {
              // Get the largest image
              const sizes = Object.keys(parsed).sort((a, b) => parseInt(b) - parseInt(a))
              if (sizes.length > 0) {
                imageUrl = parsed[sizes[0]]
              }
            }
          } catch (e) {
            // Not JSON, use as is
          }
        }
        
        if (imageUrl && imageUrl.startsWith('http')) {
          return imageUrl
        }
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

