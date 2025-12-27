/**
 * Check if content exists for a specific product
 */

import { prisma } from '../lib/prisma'

async function checkProductContent(productName: string) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        name: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      include: {
        content: true,
        trendSignals: true,
      },
    })

    if (!product) {
      console.log(`❌ Product "${productName}" not found in database`)
      return
    }

    console.log(`\n✅ Found product: ${product.name}`)
    console.log(`   ID: ${product.id}`)
    console.log(`   Brand: ${product.brand || 'N/A'}`)
    console.log(`   Status: ${product.status}`)
    console.log(`   Trend Score: ${product.trendScore}`)
    console.log(`   Amazon URL: ${product.amazonUrl || 'N/A'}`)
    console.log(`   Trend Signals: ${product.trendSignals.length}`)

    if (product.content) {
      console.log(`\n✅ CONTENT EXISTS:`)
      console.log(`   Slug: ${product.content.slug}`)
      console.log(`   Hook: ${product.content.hook ? '✅' : '❌'}`)
      console.log(`   Why Trending: ${product.content.whyTrending ? '✅' : '❌'}`)
      console.log(`   What It Does: ${product.content.whatItDoes ? '✅' : '❌'}`)
      console.log(`   The Good: ${product.content.theGood ? '✅' : '❌'}`)
      console.log(`   The Bad: ${product.content.theBad ? '✅' : '❌'}`)
      console.log(`   Who Should Try: ${product.content.whoShouldTry ? '✅' : '❌'}`)
      console.log(`   Who Should Skip: ${product.content.whoShouldSkip ? '✅' : '❌'}`)
      console.log(`   Alternatives: ${product.content.alternatives ? '✅' : '❌'}`)
      console.log(`   FAQ: ${product.content.faq ? '✅' : '❌'}`)
      console.log(`   Generated At: ${product.content.generatedAt}`)
      console.log(`   Updated At: ${product.content.updatedAt}`)
      console.log(`\n   View at: /products/${product.content.slug}`)
    } else {
      console.log(`\n❌ NO CONTENT GENERATED YET`)
      console.log(`   You can generate content at: /admin/products/${product.id}/edit`)
    }
  } catch (error) {
    console.error('Error checking product:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get product name from command line or use default
const productName = process.argv[2] || 'Atoderm Shower Oil'
checkProductContent(productName)






