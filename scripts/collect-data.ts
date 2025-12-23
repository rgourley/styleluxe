/**
 * Main Data Collection Script
 * 
 * New approach:
 * 1. Collect Amazon Movers & Shakers (discovery)
 * 2. Weekly Reddit Scan (extract product names from high-engagement posts)
 * 3. Match Amazon products to Reddit products (simple check, no Reddit search)
 * 4. Google Trends (optional)
 * 5. Final enrichment/merging
 */

import { processAmazonData } from './collect-amazon'
import { weeklyRedditScan } from './weekly-reddit-scan'
import { matchAmazonToReddit } from './match-amazon-to-reddit'
import { processGoogleTrends } from './collect-google-trends'
import { enrichProducts } from './enrich-products'

async function main() {
  console.log('='.repeat(60))
  console.log('StyleLuxe Data Collection')
  console.log('='.repeat(60))
  console.log()

  try {
    // Step 1: Collect Amazon Movers & Shakers (discovery)
    console.log('Step 1: Collecting from Amazon Movers & Shakers...')
    console.log('='.repeat(60))
    await processAmazonData()
    console.log()
    
    // Step 2: Weekly Reddit Scan (extract product names from high-engagement posts)
    console.log('Step 2: Weekly Reddit Scan (extracting product names)...')
    console.log('='.repeat(60))
    await weeklyRedditScan()
    console.log()
    
    // Step 3: Match Amazon products to Reddit products (simple check)
    console.log('Step 3: Matching Amazon products to Reddit products...')
    console.log('='.repeat(60))
    await matchAmazonToReddit()
    console.log()
    
    // Step 4: Google Trends (optional)
    console.log('Step 4: Collecting from Google Trends...')
    console.log('='.repeat(60))
    await processGoogleTrends()
    console.log()

    // Step 5: Final enrichment and merging
    console.log('Step 5: Final enrichment and merging...')
    console.log('='.repeat(60))
    await enrichProducts()

    console.log('\n' + '='.repeat(60))
    console.log('All data collection and enrichment complete!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('Error in data collection:', error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

