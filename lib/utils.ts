/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
}

/**
 * Generate a unique slug by checking if it exists and appending a number if needed
 * Also handles orphaned ProductContent records (where the product no longer exists)
 */
export async function generateUniqueSlug(
  baseSlug: string,
  excludeProductId?: string
): Promise<string> {
  // Lazy load prisma to avoid circular dependencies
  const { prisma } = await import('./prisma')
  
  let slug = baseSlug
  let counter = 1
  const maxAttempts = 100 // Safety limit
  
  while (counter < maxAttempts) {
    // Check if slug exists (excluding current product if provided)
    const existing = await prisma.productContent.findUnique({
      where: { slug },
      select: { productId: true },
    })
    
    // If slug doesn't exist, we can use it
    if (!existing) {
      return slug
    }
    
    // If slug exists but belongs to the same product, we can use it
    if (excludeProductId && existing.productId === excludeProductId) {
      return slug
    }
    
    // Check if the product associated with this slug still exists
    // If not, it's an orphaned record and we can reuse the slug
    // (but we should clean it up first)
    if (!excludeProductId || existing.productId !== excludeProductId) {
      const productExists = await prisma.product.findUnique({
        where: { id: existing.productId },
        select: { id: true },
      })
      
      // If product doesn't exist, this is an orphaned slug - we can reuse it
      // But first delete the orphaned record to avoid constraint issues
      if (!productExists) {
        try {
          await prisma.productContent.delete({
            where: { slug },
          })
          console.log(`🧹 Cleaned up orphaned ProductContent with slug: ${slug}`)
          return slug // Now we can use this slug
        } catch (error) {
          // If deletion fails, continue to try with a suffix
          console.warn(`⚠️ Failed to delete orphaned content with slug ${slug}:`, error)
        }
      }
    }
    
    // Slug exists for a different, valid product, try with a suffix
    const base = baseSlug.substring(0, 90) // Leave room for suffix
    slug = `${base}-${counter}`
    counter++
  }
  
  // Fallback: use timestamp if we can't find a unique slug
  const timestamp = Date.now().toString(36)
  return `${baseSlug.substring(0, 70)}-${timestamp}`
}







