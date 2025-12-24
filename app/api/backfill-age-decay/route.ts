import { NextResponse } from 'next/server'

/**
 * API endpoint to backfill age decay data for existing products
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 Starting age decay backfill via API...')
    // Use dynamic import to prevent execution during build
    const { backfillAgeDecay } = await import('@/scripts/backfill-age-decay')
    const result = await backfillAgeDecay()
    
    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${result.updated} products updated, ${result.recalculated} recalculated`,
      updated: result.updated,
      recalculated: result.recalculated,
      errors: result.errors,
    })
  } catch (error) {
    console.error('❌ Error in backfill:', error)
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





