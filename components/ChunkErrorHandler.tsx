'use client'

import { useEffect } from 'react'

/**
 * Handles chunk loading errors by reloading the page
 * This fixes issues where old HTML references chunks that no longer exist
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      // Check if it's a chunk loading error
      const isChunkError = 
        event.message?.includes('ChunkLoadError') ||
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Failed to fetch dynamically imported module') ||
        (event.filename?.includes('_next/static/chunks/') && event.message?.includes('404'))

      if (isChunkError) {
        console.warn('Chunk loading error detected, reloading page...', event)
        // Reload the page to get fresh chunks
        window.location.reload()
      }
    }

    // Listen for unhandled errors
    window.addEventListener('error', handleChunkError, true)

    // Also listen for unhandled promise rejections (chunk errors often come as promises)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorMessage = error?.message || String(error || '')
      
      const isChunkError = 
        errorMessage.includes('ChunkLoadError') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Failed to load chunk')

      if (isChunkError) {
        console.warn('Chunk loading error detected in promise rejection, reloading page...', error)
        event.preventDefault() // Prevent default error handling
        window.location.reload()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleChunkError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}

