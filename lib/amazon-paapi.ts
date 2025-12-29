/**
 * Amazon Product Advertising API 5.0 Integration
 * 
 * Uses PA-API to search for products programmatically
 * Much faster and more reliable than scraping
 */

import { createHash, createHmac } from 'crypto'

interface PAAPICredentials {
  accessKey: string
  secretKey: string
  partnerTag: string // Your Associates Store ID
  partnerType: string // Default: 'Associates'
  marketplace: string // Default: 'www.amazon.com'
}

interface PAAPIItem {
  ASIN: string
  DetailPageURL: string
  Images?: {
    Primary?: {
      Large?: { URL: string }
      Medium?: { URL: string }
    }
  }
  ItemInfo?: {
    ByLineInfo?: {
      Brand?: {
        DisplayValue: string
      }
    }
    Title?: {
      DisplayValue: string
    }
    ProductInfo?: {
      UnitCount?: {
        DisplayValue: number
      }
    }
  }
  Offers?: {
    Listings?: Array<{
      Price?: {
        DisplayAmount: string
        Amount: number
        Currency: string
      }
      Availability?: {
        Message: string
      }
    }>
  }
  CustomerReviews?: {
    StarRating?: {
      Value: number
    }
    ReviewsCount?: number
  }
}

interface PAAPIResponse {
  SearchResult?: {
    Items?: PAAPIItem[]
    TotalResultCount?: number
  }
  Errors?: Array<{
    Code: string
    Message: string
  }>
}

// Rate limiting: 1 request per second (Amazon's limit)
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

/**
 * Create AWS Signature Version 4 signature for PA-API request
 */
function createSignature(
  method: string,
  uri: string,
  queryString: string,
  headers: Record<string, string>,
  payload: string,
  secretKey: string,
  accessKey: string,
  region: string = 'us-east-1',
  service: string = 'ProductAdvertisingAPI'
): string {
  const algorithm = 'AWS4-HMAC-SHA256'
  const amzDate = headers['X-Amz-Date']
  const dateStamp = amzDate.substring(0, 8)

  // Step 1: Create canonical request
  // Headers must be sorted and formatted correctly
  const sortedHeaders = Object.keys(headers).sort()
  const canonicalHeaders = sortedHeaders
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n') + '\n'
  const signedHeaders = sortedHeaders
    .map(key => key.toLowerCase())
    .join(';')
  const payloadHash = createHash('sha256').update(payload, 'utf8').digest('hex')
  
  const canonicalRequest = [
    method,
    uri,
    queryString || '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  // Step 2: Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const canonicalRequestHash = createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  // Step 3: Calculate signature
  // Note: secretKey must be converted to Buffer for HMAC
  const kSecret = Buffer.from(`AWS4${secretKey}`, 'utf8')
  const kDate = createHmac('sha256', kSecret).update(dateStamp, 'utf8').digest()
  const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest()
  const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request', 'utf8').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')

  return signature
}

/**
 * Make a PA-API request
 */
async function makePAAPIRequest(
  operation: string,
  payload: Record<string, any>,
  credentials: PAAPICredentials
): Promise<PAAPIResponse> {
  await waitForRateLimit()

  const endpoint = 'webservices.amazon.com'
  const uri = '/paapi5/searchitems'
  const method = 'POST'
  const service = 'ProductAdvertisingAPI'
  const region = 'us-east-1'
  const host = endpoint

  // Format date correctly: YYYYMMDDTHHMMSSZ
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  
  const amzDate = `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  const dateStamp = `${year}${month}${day}`

  const requestPayload = JSON.stringify({
    PartnerTag: credentials.partnerTag,
    PartnerType: credentials.partnerType || 'Associates',
    Marketplace: credentials.marketplace || 'www.amazon.com',
    ...payload,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Amz-Date': amzDate,
  }

  const signature = createSignature(
    method,
    uri,
    '',
    headers,
    requestPayload,
    credentials.secretKey,
    credentials.accessKey,
    region,
    service
  )

  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${credentials.accessKey}/${dateStamp}/${region}/${service}/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`

  try {
    const response = await fetch(`https://${host}${uri}`, {
      method,
      headers,
      body: requestPayload,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `PA-API request failed: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.Errors && errorJson.Errors.length > 0) {
          errorMessage = `PA-API Error: ${errorJson.Errors.map((e: any) => `${e.Code}: ${e.Message}`).join(', ')}`
        } else if (errorJson.Output) {
          errorMessage = `PA-API Error: ${JSON.stringify(errorJson.Output)}`
        }
      } catch {
        // If not JSON, use raw text
        errorMessage = `PA-API Error (${response.status}): ${errorText.substring(0, 200)}`
      }
      console.error(errorMessage)
      throw new Error(errorMessage)
    }

    const data: PAAPIResponse = await response.json()
    
    if (data.Errors && data.Errors.length > 0) {
      console.error('PA-API Errors:', data.Errors)
      throw new Error(`PA-API errors: ${data.Errors.map(e => e.Message).join(', ')}`)
    }

    return data
  } catch (error) {
    console.error('PA-API request error:', error)
    throw error
  }
}

/**
 * Search Amazon products using PA-API
 */
export async function searchAmazonWithPAAPI(
  searchQuery: string,
  credentials: PAAPICredentials
): Promise<PAAPIItem[] | null> {
  try {
    const response = await makePAAPIRequest('SearchItems', {
      Keywords: searchQuery,
      SearchIndex: 'Beauty', // Focus on beauty products
      ItemCount: 10, // Get top 10 results
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ProductInfo',
        'Images.Primary.Large',
        'Images.Primary.Medium',
        'Offers.Listings.Price',
        'Offers.Listings.Availability',
        'CustomerReviews.StarRating',
        'CustomerReviews.ReviewsCount',
      ],
    }, credentials)

    return response.SearchResult?.Items || null
  } catch (error) {
    console.error('PA-API search error:', error)
    return null
  }
}

/**
 * Convert PA-API item to AmazonSearchResult format
 */
export function convertPAAPIItemToResult(item: PAAPIItem, partnerTag: string): {
  name: string
  brand?: string
  price?: number
  imageUrl?: string
  amazonUrl: string
  rating?: number
  reviewCount?: number
} {
  const name = item.ItemInfo?.Title?.DisplayValue || ''
  const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue
  const imageUrl = item.Images?.Primary?.Large?.URL || item.Images?.Primary?.Medium?.URL
  const amazonUrl = item.DetailPageURL || `https://www.amazon.com/dp/${item.ASIN}`
  
  // Add affiliate tag to URL
  const urlWithTag = amazonUrl.includes('?') 
    ? `${amazonUrl}&tag=${partnerTag}`
    : `${amazonUrl}?tag=${partnerTag}`

  const price = item.Offers?.Listings?.[0]?.Price?.Amount
  const rating = item.CustomerReviews?.StarRating?.Value
  const reviewCount = item.CustomerReviews?.ReviewsCount

  return {
    name,
    brand,
    price: price ? price / 100 : undefined, // PA-API returns price in cents
    imageUrl,
    amazonUrl: urlWithTag,
    rating,
    reviewCount,
  }
}

