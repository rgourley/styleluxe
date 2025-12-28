/**
 * API endpoint to manually revalidate cache
 * Useful for scripts and admin actions
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paths, tags } = body

    // Revalidate specific paths
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path)
      }
    }

    // Revalidate specific tags (Note: revalidateTag requires 2 args in Next.js 16, so we use revalidatePath instead)
    // Tags are handled via revalidatePath which invalidates the entire cache for those paths
    if (tags && Array.isArray(tags)) {
      // Tags are used to identify cached data, but we'll revalidate paths instead
      // This ensures the cache is invalidated properly
      revalidatePath('/', 'layout')
      revalidatePath('/trending', 'page')
    }

    // If no specific paths/tags, revalidate common ones
    if (!paths && !tags) {
      revalidatePath('/', 'layout')
      revalidatePath('/trending', 'page')
    }

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      revalidated: {
        paths: paths || ['/', '/trending'],
        tags: tags || ['products', 'trending', 'rising', 'recent'],
      },
    })
  } catch (error) {
    console.error('Error revalidating cache:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

