/**
 * Test Amazon PA-API Integration
 * 
 * This script tests if PA-API credentials are working correctly
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Try loading .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { searchAmazonProduct } from '../lib/amazon-search'

async function testPAAPI() {
  console.log('🧪 Testing Amazon PA-API Integration...\n')

  // Check if credentials are configured
  const hasAccessKey = !!process.env.AMAZON_PAAPI_ACCESS_KEY
  const hasSecretKey = !!process.env.AMAZON_PAAPI_SECRET_KEY
  const hasPartnerTag = !!process.env.AMAZON_PAAPI_PARTNER_TAG

  console.log('📋 Credentials Check:')
  console.log(`  Access Key: ${hasAccessKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`  Secret Key: ${hasSecretKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`  Partner Tag: ${hasPartnerTag ? '✅ Configured' : '❌ Missing'}`)
  console.log(`  Partner Tag Value: ${process.env.AMAZON_PAAPI_PARTNER_TAG || 'Not set'}\n`)

  if (!hasAccessKey || !hasSecretKey || !hasPartnerTag) {
    console.log('❌ PA-API credentials not fully configured.')
    console.log('   Add these to your .env file:')
    console.log('   AMAZON_PAAPI_ACCESS_KEY=your_access_key')
    console.log('   AMAZON_PAAPI_SECRET_KEY=your_secret_key')
    console.log('   AMAZON_PAAPI_PARTNER_TAG=your_partner_tag')
    console.log('\n   Will fall back to scraping method.\n')
    return
  }

  // Test with a common beauty product
  const testProducts = [
    'CeraVe Moisturizing Cream',
    'The Ordinary Niacinamide',
    'La Roche-Posay Sunscreen',
  ]

  console.log('🔍 Testing product searches...\n')

  for (const productName of testProducts) {
    console.log(`Searching for: "${productName}"`)
    try {
      const startTime = Date.now()
      const result = await searchAmazonProduct(productName)
      const duration = Date.now() - startTime

      if (result) {
        console.log(`  ✅ Found in ${duration}ms`)
        console.log(`     Name: ${result.name}`)
        if (result.brand) console.log(`     Brand: ${result.brand}`)
        if (result.price) console.log(`     Price: $${result.price.toFixed(2)}`)
        if (result.rating) console.log(`     Rating: ${result.rating}/5`)
        if (result.reviewCount) console.log(`     Reviews: ${result.reviewCount.toLocaleString()}`)
        console.log(`     URL: ${result.amazonUrl.substring(0, 80)}...`)
        console.log(`     Has Affiliate Tag: ${result.amazonUrl.includes(process.env.AMAZON_PAAPI_PARTNER_TAG || '') ? '✅' : '❌'}`)
      } else {
        console.log(`  ❌ Not found (took ${duration}ms)`)
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
    
    // Wait 1 second between requests (rate limiting)
    if (testProducts.indexOf(productName) < testProducts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('✅ Test complete!')
  console.log('\n💡 Note: If you see "PA-API found" in the logs, PA-API is working!')
  console.log('   If not, it will fall back to scraping (slower but still works).')
}

testPAAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })

