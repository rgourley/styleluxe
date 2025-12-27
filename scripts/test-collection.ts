/**
 * Test Collection Script
 * 
 * Quick test to see what's being collected and why scores are 0
 */

import { processRedditData } from './collect-reddit'
import { processAmazonData } from './collect-amazon'

async function testCollection() {
  console.log('='.repeat(60))
  console.log('Testing Data Collection')
  console.log('='.repeat(60))
  console.log()

  try {
    console.log('Testing Reddit collection...\n')
    await processRedditData()
    
    console.log('\n' + '-'.repeat(60) + '\n')
    
    console.log('Testing Amazon collection...\n')
    await processAmazonData()
    
    console.log('\n' + '='.repeat(60))
    console.log('Test complete! Check output above for issues.')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('Error:', error)
  }
}

testCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })







