/**
 * Clear All Products Script
 * 
 * Deletes all products, trend signals, reviews, and content from the database.
 * Use this to start fresh with the new scoring system.
 */

import { prisma } from '../lib/prisma'

async function clearAllProducts() {
  console.log('Clearing all products and related data...\n')

  try {
    // Delete in order (respecting foreign key constraints)
    const deletedReviews = await prisma.review.deleteMany({})
    console.log(`✅ Deleted ${deletedReviews.count} reviews`)

    const deletedContent = await prisma.productContent.deleteMany({})
    console.log(`✅ Deleted ${deletedContent.count} product content records`)

    const deletedSignals = await prisma.trendSignal.deleteMany({})
    console.log(`✅ Deleted ${deletedSignals.count} trend signals`)

    const deletedProducts = await prisma.product.deleteMany({})
    console.log(`✅ Deleted ${deletedProducts.count} products`)

    console.log('\n✅ Database cleared! Ready for fresh data collection.')
  } catch (error) {
    console.error('Error clearing database:', error)
    throw error
  }
}

clearAllProducts()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })






