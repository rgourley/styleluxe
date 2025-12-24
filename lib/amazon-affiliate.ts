/**
 * Amazon Associates URL utility
 * Adds affiliate tag to Amazon URLs
 */

/**
 * Add Amazon Associates tag to an Amazon URL
 * @param amazonUrl - The Amazon product URL
 * @returns URL with affiliate tag added
 */
export function addAmazonAffiliateTag(amazonUrl: string | null | undefined): string | null {
  if (!amazonUrl) return null

  const associateTag = process.env.AMAZON_ASSOCIATE_TAG || 'enduranceonli-20'

  try {
    const url = new URL(amazonUrl)
    
    // Add or update the tag parameter
    url.searchParams.set('tag', associateTag)
    
    return url.toString()
  } catch (error) {
    // If URL parsing fails, try to append the tag manually
    if (amazonUrl.includes('?')) {
      return `${amazonUrl}&tag=${associateTag}`
    } else {
      return `${amazonUrl}?tag=${associateTag}`
    }
  }
}





