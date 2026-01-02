/**
 * Image Storage Utility
 * Handles downloading Amazon images and storing them in R2
 */

import { downloadAndUploadToR2, generateImageFileName, imageExistsInR2, getFileExtension } from './r2-storage'

/**
 * Store an Amazon product image in R2
 * Downloads the image from Amazon and uploads it to R2
 * 
 * @param amazonImageUrl - URL of the Amazon image
 * @param productId - Product ID for generating unique filename
 * @param asin - Amazon ASIN (optional, for uniqueness)
 * @returns Public URL of the stored image in R2, or null if failed
 */
export async function storeAmazonImageInR2(
  amazonImageUrl: string,
  productId: string,
  asin?: string
): Promise<string | null> {
  try {
    // Generate unique filename
    const extension = getFileExtension(amazonImageUrl)
    const fileName = generateImageFileName(productId, asin, extension)

    // Check if image already exists in R2 (avoid re-downloading)
    const exists = await imageExistsInR2(fileName)
    if (exists) {
      // Return existing URL
      const r2PublicUrl = process.env.R2_PUBLIC_URL || ''
      const bucketName = process.env.R2_BUCKET_NAME || ''
      if (r2PublicUrl) {
        return `${r2PublicUrl}/products/${fileName}`
      } else if (bucketName) {
        return `https://${bucketName}.r2.cloudflarestorage.com/products/${fileName}`
      }
    }

    // Download and upload to R2
    const r2Url = await downloadAndUploadToR2(amazonImageUrl, fileName)
    console.log(`✅ Stored image in R2: ${r2Url}`)
    return r2Url
  } catch (error) {
    console.error(`❌ Failed to store Amazon image in R2:`, error)
    // Return null on failure - we'll fall back to the original URL
    return null
  }
}

/**
 * Extract ASIN from Amazon URL
 */
export function extractASINFromUrl(amazonUrl: string): string | null {
  const match = amazonUrl.match(/\/dp\/([A-Z0-9]{10})|ASIN[=:]([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i)
  return match ? (match[1] || match[2] || match[3]) : null
}

/**
 * Check if an image URL is an R2 image (should not be overwritten)
 */
export function isR2Image(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false
  return (
    imageUrl.includes('r2.dev') || 
    imageUrl.includes('r2.cloudflarestorage.com') ||
    imageUrl.includes('pub-') // R2 public URLs
  )
}

