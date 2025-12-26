/**
 * Check if reviews are in the database
 */

import { prisma } from '../lib/prisma'

async function checkReviews() {
  console.log('Checking reviews for products...\n')

  const product = await prisma.product.findFirst({
    where: {
      status: 'PUBLISHED',
      name: { contains: 'Lip Glowy' }
    },
    include: {
      reviews: {
        take: 5,
      },
      content: true,
    },
  })
  
  if (product) {
    console.log('Product:', product.name)
    console.log('Reviews count:', product.reviews?.length || 0)
    if (product.reviews && product.reviews.length > 0) {
      console.log('\nSample reviews:')
      for (const review of product.reviews.slice(0, 3)) {
        console.log(`  Rating: ${review.rating}/5`)
        console.log(`  Content: "${review.content?.substring(0, 100)}..."`)
        console.log(`  Helpful: ${review.helpful || 0}`)
        console.log()
      }
    } else {
      console.log('❌ No reviews found for this product')
    }
    console.log('Hook:', product.content?.hook?.substring(0, 100))
  } else {
    console.log('❌ Product not found')
  }
  
  await prisma.$disconnect()
}

checkReviews().catch(console.error)

