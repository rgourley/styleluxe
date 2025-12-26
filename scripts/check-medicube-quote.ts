/**
 * Check if medicube Triple Collagen Cream has whatRealUsersSay content
 */

import { prisma } from '../lib/prisma'

async function checkMedicubeQuote() {
  console.log('Checking medicube Triple Collagen Cream...\n')

  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'medicube Triple Collagen' }
    },
    include: {
      content: true,
    },
  })
  
  if (product) {
    console.log('Product:', product.name)
    console.log('Status:', product.status)
    console.log('Has content:', !!product.content)
    
    if (product.content) {
      console.log('\nwhatRealUsersSay:')
      console.log(product.content.whatRealUsersSay || '❌ NULL')
      
      // Test quote extraction
      const whatRealUsersSay = product.content.whatRealUsersSay
      if (whatRealUsersSay) {
        const quoteMatch = whatRealUsersSay.match(/"([^"]{20,150})"/) || 
                           whatRealUsersSay.match(/"([^"]{20,150})"/)
        
        if (quoteMatch && quoteMatch[1]) {
          console.log('\n✅ Extracted quote:', `"${quoteMatch[1].trim()}"`)
        } else {
          console.log('\n⚠️  No quote found in expected format')
          console.log('Trying fallback (first sentence):')
          const sentences = whatRealUsersSay.split(/[.!?]\s+/)
          if (sentences[0] && sentences[0].length >= 20 && sentences[0].length <= 150) {
            console.log('Fallback quote:', sentences[0].trim())
          } else {
            console.log('First sentence too long or short:', sentences[0]?.length, 'chars')
          }
        }
      }
      
      console.log('\nHook:', product.content.hook?.substring(0, 100))
    } else {
      console.log('\n❌ No content generated for this product')
    }
  } else {
    console.log('❌ Product not found')
  }
  
  await prisma.$disconnect()
}

checkMedicubeQuote().catch(console.error)

