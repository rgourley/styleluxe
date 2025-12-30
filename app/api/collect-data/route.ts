import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

// Import the name extraction function
async function extractNamesFromUrls() {
  const { exec } = require('child_process')
  return new Promise((resolve, reject) => {
    exec('tsx scripts/extract-name-from-url.ts', (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Name extraction error:', error)
        reject(error)
      } else {
        console.log(stdout)
        resolve(stdout)
      }
    })
  })
}

export async function POST(request: Request) {
  // Check authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    // Lazy load all script functions to prevent build-time execution
    const { source } = await request.json()

    let result

    switch (source) {
      case 'reddit':
        // Weekly Reddit scan (extract product names from high-engagement posts)
        const { weeklyRedditScan } = await import('../../../scripts/weekly-reddit-scan')
        await weeklyRedditScan()
        result = { success: true, message: 'Weekly Reddit scan completed' }
        break
      case 'match':
        // Match Amazon products to Reddit products
        const { matchAmazonToReddit } = await import('../../../scripts/match-amazon-to-reddit')
        await matchAmazonToReddit()
        result = { success: true, message: 'Amazon-Reddit matching completed' }
        break
      case 'amazon':
        const { processAmazonData } = await import('../../../scripts/collect-amazon')
        await processAmazonData()
        // Try to extract names from URLs for products with missing names
        try {
          await extractNamesFromUrls()
        } catch (e) {
          console.error('Name extraction failed (non-critical):', e)
        }
        result = { success: true, message: 'Amazon data collection completed' }
        break
      case 'trends':
        const { processGoogleTrends } = await import('../../../scripts/collect-google-trends')
        await processGoogleTrends()
        result = { success: true, message: 'Google Trends collection completed' }
        break
      case 'all':
        // NEW APPROACH:
        // 1. Amazon discovery (primary source)
        const { processAmazonData: processAmazonDataAll } = await import('../../../scripts/collect-amazon')
        await processAmazonDataAll()
        
        // 2. Weekly Reddit scan (extract product names from high-engagement posts)
        try {
          const { weeklyRedditScan: weeklyRedditScanAll } = await import('../../../scripts/weekly-reddit-scan')
          await weeklyRedditScanAll()
        } catch (redditError) {
          console.error('Weekly Reddit scan failed (non-critical):', redditError)
        }
        
        // 3. Match Amazon products to Reddit products (simple check)
        try {
          const { matchAmazonToReddit: matchAmazonToRedditAll } = await import('../../../scripts/match-amazon-to-reddit')
          await matchAmazonToRedditAll()
        } catch (matchError) {
          console.error('Amazon-Reddit matching failed (non-critical):', matchError)
        }
        
        // 4. Google Trends (optional)
        try {
          const { processGoogleTrends: processGoogleTrendsAll } = await import('../../../scripts/collect-google-trends')
          await processGoogleTrendsAll()
        } catch (trendsError) {
          console.error('Google Trends failed (non-critical):', trendsError)
        }
        
        // 5. Final enrichment to combine any remaining products
        try {
          const { enrichProducts } = await import('../../../scripts/enrich-products')
          await enrichProducts()
        } catch (enrichError) {
          console.error('Final enrichment failed (non-critical):', enrichError)
        }
        
        result = { success: true, message: 'Full collection completed: Amazon → Weekly Reddit Scan → Matching → Enrichment' }
        break
      case 'enrich':
        const { enrichProducts: enrichProductsEnrich } = await import('../../../scripts/enrich-products')
        await enrichProductsEnrich()
        result = { success: true, message: 'Product enrichment completed' }
        break
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid source' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Data collection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

