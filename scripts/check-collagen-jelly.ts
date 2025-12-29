import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProduct() {
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'Collagen Jelly', mode: 'insensitive' }
    },
    select: {
      id: true,
      name: true,
      baseScore: true,
      currentScore: true,
      onMoversShakers: true,
      lastSeenOnMoversShakers: true,
      firstDetected: true,
      daysTrending: true,
      amazonUrl: true,
      createdAt: true,
    }
  })
  
  if (product) {
    console.log('✅ Product found:')
    console.log(JSON.stringify(product, null, 2))
  } else {
    console.log('❌ Product not found in database')
  }
  
  await prisma.$disconnect()
}

checkProduct().catch(console.error)




