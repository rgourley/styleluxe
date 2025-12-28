/**
 * Check if a specific slug exists in ProductContent
 */

import { prisma } from '../lib/prisma'

async function checkSlug() {
  const slugToCheck = process.argv[2] || 'champagne-shimmer-eyeshadow'
  
  console.log(`🔍 Checking for slug: "${slugToCheck}"\n`)

  try {
    const content = await prisma.productContent.findUnique({
      where: { slug: slugToCheck },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    })

    if (content) {
      console.log('✅ Slug exists!')
      console.log(`\nProductContent ID: ${content.id}`)
      console.log(`Product ID: ${content.productId}`)
      console.log(`Product Name: ${content.product?.name || 'NOT FOUND (orphaned!)'}`)
      console.log(`Product Status: ${content.product?.status || 'N/A'}`)
    } else {
      console.log('❌ Slug does not exist')
      
      // Check if there's a similar slug
      const allContent = await prisma.productContent.findMany({
        select: { slug: true },
      })
      
      const similar = allContent.filter(c => 
        c.slug.toLowerCase().includes('champagne') || 
        c.slug.toLowerCase().includes('shimmer') ||
        c.slug.toLowerCase().includes('eyeshadow')
      )
      
      if (similar.length > 0) {
        console.log(`\n📋 Similar slugs found:`)
        similar.forEach(c => console.log(`  - ${c.slug}`))
      }
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

checkSlug()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

