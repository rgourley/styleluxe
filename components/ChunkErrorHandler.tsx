'use client'

import { useEffect } from 'react'

/**
 * Handles chunk loading errors by reloading the page
 * This fixes issues where old HTML references chunks that no longer exist
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    // Check for chunk errors immediately on load
    const checkForChunkErrors = () => {
      // Look for script tags that failed to load
      const scripts = document.querySelectorAll('script[src*="_next/static/chunks/"]')
      scripts.forEach((script) => {
        script.addEventListener('error', () => {
          const src = (script as HTMLScriptElement).src
          if (src.includes('_next/static/chunks/')) {
            console.warn('Chunk script failed to load, reloading page...', src)
            // Add a small delay to prevent infinite reload loops
            setTimeout(() => {
              window.location.reload()
            }, 100)
          }
        }, { once: true })
      })
    }

    checkForChunkErrors()

    const handleChunkError = (event: ErrorEvent) => {
      // Check if it's a chunk loading error
      const isChunkError = 
        event.message?.includes('ChunkLoadError') ||
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Failed to load chunk') ||
        (event.filename?.includes('_next/static/chunks/') && (event.message?.includes('404') || event.message?.includes('Failed')))

      if (isChunkError) {
        console.warn('Chunk loading error detected, reloading page...', event)
        // Prevent infinite reload loops - only reload once per session
        const hasReloaded = sessionStorage.getItem('chunk-error-reload')
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-error-reload', 'true')
          setTimeout(() => {
            window.location.reload()
          }, 100)
        }
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
        errorMessage.includes('Failed to load chunk') ||
        errorMessage.includes('404')

      if (isChunkError) {
        console.warn('Chunk loading error detected in promise rejection, reloading page...', error)
        event.preventDefault() // Prevent default error handling
        
        // Prevent infinite reload loops
        const hasReloaded = sessionStorage.getItem('chunk-error-reload')
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-error-reload', 'true')
          setTimeout(() => {
            window.location.reload()
          }, 100)
        }
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

