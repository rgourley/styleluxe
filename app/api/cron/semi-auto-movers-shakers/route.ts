import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes (scrape + Claude can be slow)

/**
 * Cron: semi-auto add up to 2 Movers & Shakers products per day.
 * Call via Vercel Cron or GET with Authorization: Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { runSemiAutoMoversShakers } = await import('../../../../scripts/semi-auto-movers-shakers')
    const result = await runSemiAutoMoversShakers()
    return NextResponse.json({
      success: result.ok,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] semi-auto-movers-shakers error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
