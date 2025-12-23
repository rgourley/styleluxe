/**
 * Check how many draft products exist and their status
 * Helps decide whether to backfill or start fresh
 */

import { prisma } from '../lib/prisma'

async function checkDraftProducts() {
  try {
    // Count products by status
    const allProducts = await prisma.product.findMany({
      include: {
        content: true,
        trendSignals: true,
        reviews: true,
        metadata: true,
      },
    })

    const stats = {
      total: allProducts.length,
      published: 0,
      draft: 0,
      flagged: 0,
      withContent: 0,
      withGoogleTrends: 0,
      withRedditHotness: 0,
      withEditorNotes: 0,
      withAmazonData: 0,
    }

    for (const product of allProducts) {
      if (product.status === 'PUBLISHED') stats.published++
      if (product.status === 'DRAFT') stats.draft++
      if (product.status === 'FLAGGED') stats.flagged++
      
      if (product.content) {
        stats.withContent++
        // @ts-ignore
        if (product.content.googleTrendsData) stats.withGoogleTrends++
        // @ts-ignore
        if (product.content.redditHotness) stats.withRedditHotness++
        // @ts-ignore
        if (product.content.editorNotes) stats.withEditorNotes++
      }
      
      if (product.metadata || product.reviews.length > 0) {
        stats.withAmazonData++
      }
    }

    console.log('\n📊 Product Database Status:\n')
    console.log(`Total Products: ${stats.total}`)
    console.log(`  - Published: ${stats.published}`)
    console.log(`  - Draft: ${stats.draft}`)
    console.log(`  - Flagged: ${stats.flagged}`)
    console.log(`\nProducts with Content: ${stats.withContent}`)
    console.log(`  - With Google Trends URL: ${stats.withGoogleTrends}`)
    console.log(`  - With Reddit Hotness: ${stats.withRedditHotness}`)
    console.log(`  - With Editor Notes: ${stats.withEditorNotes}`)
    console.log(`  - With Amazon Data: ${stats.withAmazonData}`)
    
    console.log('\n💡 Recommendation:')
    if (stats.draft === 0 && stats.withContent === 0) {
      console.log('✅ Database is clean - ready to start fresh!')
    } else if (stats.draft <= 5 && stats.withGoogleTrends === 0 && stats.withRedditHotness === 0) {
      console.log('✅ Small number of drafts - recommend starting fresh for clean data')
      console.log('   (You can manually re-add the important ones with the new fields)')
    } else if (stats.draft > 10 || stats.withContent > 5) {
      console.log('⚠️  Many drafts exist - consider backfilling if they have valuable data')
      console.log('   OR start fresh if you want clean data with all new fields')
    } else {
      console.log('🤔 Moderate number of drafts - your choice:')
      console.log('   - Backfill: Keep existing data, add new fields manually')
      console.log('   - Fresh start: Delete all, start with clean data')
    }

    console.log('\n📝 To delete all products and start fresh:')
    console.log('   npx tsx scripts/clear-all-products.ts')
    console.log('\n📝 To backfill (manually add Google Trends URLs):')
    console.log('   Edit products in admin panel and add Google Trends URLs')
  } catch (error) {
    console.error('Error checking products:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDraftProducts()

