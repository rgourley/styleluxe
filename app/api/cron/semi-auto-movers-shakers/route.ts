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
    const mod = await import('../../../../scripts/semi-auto-movers-shakers')
    const runSemiAutoMoversShakers = mod.runSemiAutoMoversShakers
    if (typeof runSemiAutoMoversShakers !== 'function') {
      return NextResponse.json({
        success: false,
        error: 'runSemiAutoMoversShakers not found',
        timestamp: new Date().toISOString(),
      })
    }
    const result = await runSemiAutoMoversShakers()
    return NextResponse.json({
      success: result.ok,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[CRON] semi-auto-movers-shakers error:', err.message, err.stack)
    // Return 200 so cron doesn't retry; include error for debugging
    return NextResponse.json({
      success: false,
      error: err.message,
      name: err.name,
      timestamp: new Date().toISOString(),
    })
  }
}
