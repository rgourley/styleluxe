/**
 * Check if products have whatRealUsersSay content
 */

import { prisma } from '../lib/prisma'

async function checkUserQuotes() {
  console.log('Checking whatRealUsersSay content...\n')

  const product = await prisma.product.findFirst({
    where: {
      status: 'PUBLISHED',
      name: { contains: 'Lip Glowy' }
    },
    include: {
      content: true,
    },
  })
  
  if (product && product.content) {
    console.log('Product:', product.name)
    console.log('\nwhatRealUsersSay:', product.content.whatRealUsersSay?.substring(0, 300))
    
    // Test the quote extraction
    const whatRealUsersSay = product.content.whatRealUsersSay
    if (whatRealUsersSay) {
      const quoteMatch = whatRealUsersSay.match(/"([^"]{20,150})"/) || 
                         whatRealUsersSay.match(/"([^"]{20,150})"/)
      
      if (quoteMatch && quoteMatch[1]) {
        console.log('\n✅ Extracted quote:', `"${quoteMatch[1].trim()}"`)
      } else {
        console.log('\n⚠️  No quote found in expected format')
      }
    } else {
      console.log('\n❌ No whatRealUsersSay content')
    }
  } else {
    console.log('❌ Product or content not found')
  }
  
  await prisma.$disconnect()
}

checkUserQuotes().catch(console.error)




