import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'

/**
 * API endpoint to backfill reviews for existing products
 * POST /api/backfill-reviews
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization check here
    // For now, allow anyone to trigger it (you can add auth later)

    console.log('Starting review backfill via API...')

    // Run backfill (this will take a while)
    // Note: This is a long-running operation, so you might want to run it as a background job
    // For now, we'll run it synchronously but with a timeout
    // Use dynamic import to prevent build-time execution
    const { backfillReviews } = await import('@/scripts/backfill-reviews')
    const backfillPromise = backfillReviews()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Backfill operation timed out after 5 minutes'))
      }, 5 * 60 * 1000) // 5 minute timeout
    })

    await Promise.race([backfillPromise, timeoutPromise])

    return NextResponse.json({
      success: true,
      message: 'Review backfill completed successfully',
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

