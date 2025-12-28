/**
 * Clean up orphaned ProductContent records
 * 
 * Finds ProductContent records where the associated Product no longer exists
 * and deletes them. This can happen if products were deleted manually or
 * there were database issues.
 */

import { prisma } from '../lib/prisma'

async function cleanupOrphanedContent() {
  console.log('🧹 Cleaning up orphaned ProductContent records...\n')

  try {
    // Find all ProductContent records
    const allContent = await prisma.productContent.findMany({
      select: {
        id: true,
        productId: true,
        slug: true,
      },
    })

    console.log(`Found ${allContent.length} ProductContent records\n`)

    // Check which ones are orphaned (product doesn't exist)
    const orphanedContent: Array<{ id: string; productId: string; slug: string }> = []
    
    for (const content of allContent) {
      const product = await prisma.product.findUnique({
        where: { id: content.productId },
        select: { id: true },
      })

      if (!product) {
        orphanedContent.push(content)
      }
    }

    if (orphanedContent.length === 0) {
      console.log('✅ No orphaned ProductContent records found!')
      return
    }

    console.log(`Found ${orphanedContent.length} orphaned ProductContent records:\n`)
    orphanedContent.forEach(c => {
      console.log(`  - ID: ${c.id}, ProductID: ${c.productId}, Slug: ${c.slug}`)
    })

    console.log(`\n🗑️  Deleting ${orphanedContent.length} orphaned records...`)

    // Delete orphaned content
    const deleted = await prisma.productContent.deleteMany({
      where: {
        id: {
          in: orphanedContent.map(c => c.id),
        },
      },
    })

    console.log(`✅ Deleted ${deleted.count} orphaned ProductContent records!`)
  } catch (error) {
    console.error('❌ Error cleaning up orphaned content:', error)
    throw error
  }
}

cleanupOrphanedContent()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

