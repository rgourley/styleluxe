/**
 * Auto-sync database schema on first request
 * This ensures new columns are added before queries try to use them
 */
let schemaSyncAttempted = false
let schemaSyncPromise: Promise<void> | null = null

export async function ensureSchemaSynced(): Promise<void> {
  // Only run once per process
  if (schemaSyncAttempted) {
    return schemaSyncPromise || Promise.resolve()
  }

  schemaSyncAttempted = true

  // Run schema sync in background (don't block)
  schemaSyncPromise = (async () => {
    try {
      // Only run in production/serverless environments
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        
        // Call sync-db-schema endpoint
        const response = await fetch(`${baseUrl}/api/sync-db-schema`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            console.log('✅ Database schema auto-synced successfully')
          } else {
            console.warn('⚠️ Schema sync completed with warnings:', data.errors)
          }
        } else {
          console.warn('⚠️ Schema sync request failed:', response.statusText)
        }
      }
    } catch (error) {
      // Don't throw - schema sync is non-critical
      console.warn('⚠️ Schema auto-sync failed (non-critical):', error)
    }
  })()

  return schemaSyncPromise
}

