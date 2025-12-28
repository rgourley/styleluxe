/**
 * Cloudflare R2 Storage Utility
 * Uses S3-compatible API to upload and manage images in R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for R2 (S3-compatible)
// Extract endpoint (should be base URL without bucket name)
const getEndpoint = () => {
  if (process.env.R2_ENDPOINT) {
    // R2_ENDPOINT should be the base endpoint URL (e.g., https://account-id.r2.cloudflarestorage.com)
    // If it includes a path like /beautyfinder, remove it
    let endpoint = process.env.R2_ENDPOINT.trim()
    // Remove trailing slash
    endpoint = endpoint.replace(/\/$/, '')
    // If it has a path component (like /beautyfinder), remove it
    // But keep the protocol and domain
    const urlMatch = endpoint.match(/^(https?:\/\/[^\/]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    return endpoint
  }
  if (process.env.R2_ACCOUNT_ID) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  }
  // Default endpoint based on user's account ID
  return 'https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com'
}

// Lazy initialization of R2 client to ensure env vars are loaded
let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: getEndpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    })
  }
  return r2Client
}

// Bucket name (should be 'beautyfinder' based on your endpoint)
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'beautyfinder'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '' // e.g., https://pub-xxx.r2.dev or custom domain

/**
 * Upload an image to R2
 * @param imageBuffer - Image file as Buffer
 * @param fileName - Unique filename (e.g., product-{id}-{timestamp}.jpg)
 * @param contentType - MIME type (e.g., image/jpeg, image/png)
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToR2(
  imageBuffer: Buffer,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set')
  }
  
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY environment variables are not set')
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `products/${fileName}`,
      Body: imageBuffer,
      ContentType: contentType,
      // Note: R2 doesn't use ACL. Make bucket public via Cloudflare dashboard
      // or use a custom domain with public access
    })

    await getR2Client().send(command)

    // Return public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/products/${fileName}`
      : `https://${BUCKET_NAME}.r2.cloudflarestorage.com/products/${fileName}`

    return publicUrl
  } catch (error: any) {
    const errorMessage = error.message || String(error)
    const errorCode = error.Code || error.code || error.$metadata?.httpStatusCode
    console.error(`Error uploading image to R2 (Bucket: ${BUCKET_NAME}, Key: products/${fileName}):`, {
      message: errorMessage,
      code: errorCode,
      endpoint: getEndpoint(),
      hasCredentials: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
    })
    throw new Error(`R2 upload failed: ${errorMessage} (Code: ${errorCode || 'unknown'})`)
  }
}

/**
 * Download an image from a URL and upload to R2
 * @param imageUrl - URL of the image to download
 * @param fileName - Unique filename for storage
 * @returns Public URL of the uploaded image in R2
 */
export async function downloadAndUploadToR2(imageUrl: string, fileName: string, retries: number = 3): Promise<string> {
  let lastError: Error | null = null
  
  // Fix protocol-relative URLs (starting with //)
  let normalizedUrl = imageUrl
  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = 'https:' + normalizedUrl
  }
  // Ensure URL is absolute
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    throw new Error(`Invalid image URL format: ${imageUrl}`)
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${retries}: Downloading ${normalizedUrl.substring(0, 80)}...`)
      
      // Download the image with retry logic
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.amazon.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        // If Amazon blocked the request (403), provide helpful error message
        if (response.status === 403 && imageUrl.includes('amazon')) {
          throw new Error(`Amazon blocked the image request (403 Forbidden). The image may be protected or require authentication.`)
        }
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText.substring(0, 100)}`)
      }

      // Get content type from response or infer from URL
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const contentLength = response.headers.get('content-length')
      
      if (contentLength && parseInt(contentLength) === 0) {
        throw new Error('Image file is empty (0 bytes)')
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      if (buffer.length === 0) {
        throw new Error('Downloaded image buffer is empty')
      }

      console.log(`  ✓ Downloaded ${buffer.length} bytes, uploading to R2...`)
      
      // Upload to R2
      const r2Url = await uploadImageToR2(buffer, fileName, contentType)
      console.log(`  ✓ Uploaded to R2: ${r2Url}`)
      return r2Url
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`  ✗ Attempt ${attempt} failed:`, lastError.message)
      
      // If it's a network error or timeout, wait before retrying
      if (attempt < retries && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        const delay = attempt * 2000 // 2s, 4s, 6s
        console.log(`  ⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (attempt < retries) {
        // For other errors, shorter delay
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  // All retries failed
  throw new Error(`Failed to download/upload image after ${retries} attempts: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Check if an image already exists in R2
 * @param fileName - Filename to check
 * @returns true if image exists, false otherwise
 */
export async function imageExistsInR2(fileName: string): Promise<boolean> {
  if (!BUCKET_NAME) {
    return false
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `products/${fileName}`,
    })

    await getR2Client().send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    // If it's a different error, log it but return false
    console.error('Error checking if image exists in R2:', error)
    return false
  }
}

/**
 * Generate a unique filename for a product image
 * @param productId - Product ID
 * @param asin - Amazon ASIN (optional, for uniqueness)
 * @param extension - File extension (default: jpg)
 * @returns Unique filename
 */
export function generateImageFileName(productId: string, asin?: string, extension: string = 'jpg'): string {
  const timestamp = Date.now()
  const asinPart = asin ? `-${asin}` : ''
  return `product-${productId}${asinPart}-${timestamp}.${extension}`
}

/**
 * Extract file extension from URL or content type
 */
export function getFileExtension(url: string, contentType?: string): string {
  // Try to get extension from content type first
  if (contentType) {
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('gif')) return 'gif'
    if (contentType.includes('webp')) return 'webp'
  }

  // Fallback to URL
  const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

