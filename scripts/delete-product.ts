/**
 * Delete a product by name
 */

import { prisma } from '../lib/prisma'

async function deleteProduct(productName: string) {
  try {
    console.log(`Searching for product: "${productName}"...`)
    
    const product = await prisma.product.findFirst({
      where: {
        name: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      include: {
        reviews: true,
        trendSignals: true,
        content: true,
      },
    })
    
    if (!product) {
      console.log(`❌ Product not found: "${productName}"`)
      return
    }
    
    console.log(`Found product: ${product.name}`)
    console.log(`  ID: ${product.id}`)
    console.log(`  Reviews: ${product.reviews.length}`)
    console.log(`  Trend Signals: ${product.trendSignals.length}`)
    console.log(`  Has Content: ${product.content ? 'Yes' : 'No'}`)
    console.log()
    console.log('Deleting product and all related data...')
    
    // Delete product (cascades to reviews, signals, content)
    await prisma.product.delete({
      where: { id: product.id },
    })
    
    console.log('✅ Product deleted successfully!')
  } catch (error) {
    console.error('❌ Error deleting product:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
const productName = process.argv[2] || 'Laura Geller'

if (require.main === module) {
  deleteProduct(productName)
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { deleteProduct }





