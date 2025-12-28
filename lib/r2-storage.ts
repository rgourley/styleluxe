/**
 * Cloudflare R2 Storage Utility
 * Uses S3-compatible API to upload and manage images in R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for R2 (S3-compatible)
// Extract endpoint (should be base URL without bucket name)
const getEndpoint = () => {
  if (process.env.R2_ENDPOINT) {
    // If endpoint includes /bucket-name, remove it (bucket name is separate)
    const endpoint = process.env.R2_ENDPOINT.replace(/\/[^\/]+$/, '')
    return endpoint
  }
  if (process.env.R2_ACCOUNT_ID) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  }
  // Default endpoint based on user's account ID
  return 'https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com'
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: getEndpoint(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

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

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `products/${fileName}`,
      Body: imageBuffer,
      ContentType: contentType,
      // Note: R2 doesn't use ACL. Make bucket public via Cloudflare dashboard
      // or use a custom domain with public access
    })

    await r2Client.send(command)

    // Return public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/products/${fileName}`
      : `https://${BUCKET_NAME}.r2.cloudflarestorage.com/products/${fileName}`

    return publicUrl
  } catch (error) {
    console.error('Error uploading image to R2:', error)
    throw error
  }
}

/**
 * Download an image from a URL and upload to R2
 * @param imageUrl - URL of the image to download
 * @param fileName - Unique filename for storage
 * @returns Public URL of the uploaded image in R2
 */
export async function downloadAndUploadToR2(imageUrl: string, fileName: string): Promise<string> {
  try {
    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.amazon.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    // Get content type from response or infer from URL
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    return await uploadImageToR2(buffer, fileName, contentType)
  } catch (error) {
    console.error(`Error downloading and uploading image from ${imageUrl}:`, error)
    throw error
  }
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

    await r2Client.send(command)
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

