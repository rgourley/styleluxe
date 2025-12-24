import { NextResponse } from 'next/server'
import { processAmazonData } from '../../../../scripts/collect-amazon'
import { weeklyRedditScan } from '../../../../scripts/weekly-reddit-scan'
import { matchAmazonToReddit } from '../../../../scripts/match-amazon-to-reddit'
import { recalculateAllScores } from '@/lib/trending-products'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Cron job endpoint for automatic data collection
 * Can be called by:
 * - Vercel Cron (recommended)
 * - GitHub Actions
 * - External cron service
 * 
 * To set up Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/collect-data",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export const maxDuration = 300 // 5 minutes for cron jobs

export async function GET(request: Request) {
  // Verify it's a cron request (optional security check)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log(`[CRON] Starting automatic data collection at ${new Date().toISOString()}`)
    
    // Step 1: Collect Amazon Movers & Shakers
    console.log('[CRON] Collecting Amazon Movers & Shakers...')
    await processAmazonData()
    
    // Step 2: Weekly Reddit scan
    try {
      console.log('[CRON] Running weekly Reddit scan...')
      await weeklyRedditScan()
    } catch (redditError) {
      console.error('[CRON] Reddit scan failed (non-critical):', redditError)
    }
    
    // Step 3: Match Amazon to Reddit
    try {
      console.log('[CRON] Matching Amazon to Reddit products...')
      await matchAmazonToReddit()
    } catch (matchError) {
      console.error('[CRON] Matching failed (non-critical):', matchError)
    }
    
    // Step 4: Recalculate age decay scores
    console.log('[CRON] Recalculating age decay scores...')
    const scoreResult = await recalculateAllScores()
    console.log(`[CRON] Updated ${scoreResult.updated} product scores`)
    
    return NextResponse.json({
      success: true,
      message: 'Automatic data collection completed',
      timestamp: new Date().toISOString(),
      scoresUpdated: scoreResult.updated,
    })
  } catch (error) {
    console.error('[CRON] Error in automatic collection:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

