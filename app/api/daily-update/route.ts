import { NextResponse } from 'next/server'
import { recalculateAllScores } from '@/lib/trending-products'

/**
 * Daily update endpoint to recalculate age decay scores
 * Should be called daily at 6:00 AM via cron job or scheduled task
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization check here
    // For Vercel Cron, this is automatically authenticated
    // For manual calls, you can add a secret check:
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Only check auth if CRON_SECRET is set (for manual API calls)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow Vercel Cron requests (they include a special header)
      const isVercelCron = request.headers.get('x-vercel-cron') === '1'
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('🔄 Starting daily score recalculation...')
    const result = await recalculateAllScores()
    
    console.log(`✅ Daily update complete: ${result.updated} products updated, ${result.errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Daily update complete: ${result.updated} products updated, ${result.errors} errors`,
      updated: result.updated,
      errors: result.errors,
    })
  } catch (error) {
    console.error('❌ Error in daily update:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing
export async function GET() {
  return POST(new Request('http://localhost'))
}

