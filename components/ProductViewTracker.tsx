'use client'

import { useEffect } from 'react'

/**
 * Client component to track product page views
 * Sends a request to /api/track-view when component mounts
 */
export default function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId) return

    // Track page view
    fetch('/api/track-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId }),
    }).catch((error) => {
      // Silently fail - tracking shouldn't break the page
      console.error('Failed to track page view:', error)
    })
  }, [productId])

  return null // This component doesn't render anything
}

