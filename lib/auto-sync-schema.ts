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

  // Run schema sync directly using Prisma (don't make HTTP request)
  schemaSyncPromise = (async () => {
    try {
      // Lazy load prisma to avoid build-time issues
      const { prisma } = await import('./prisma')
      
      // Only run if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        return
      }
      
      // List of schema changes that need to be applied (must match sync-db-schema route)
      const schemaChanges = [
        {
          name: 'previousSlugs column in ProductContent',
          sql: `ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "previousSlugs" JSONB;`,
        },
        {
          name: 'images column in ProductContent',
          sql: `ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "images" JSONB;`,
        },
        {
          name: 'ProductScoreHistory table',
          sql: `CREATE TABLE IF NOT EXISTS "ProductScoreHistory" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "productId" TEXT NOT NULL,
            "currentScore" DOUBLE PRECISION NOT NULL,
            "baseScore" DOUBLE PRECISION,
            "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ProductScoreHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
          )`,
        },
        {
          name: 'ProductScoreHistory productId index',
          sql: `CREATE INDEX IF NOT EXISTS "ProductScoreHistory_productId_idx" ON "ProductScoreHistory"("productId")`,
        },
        {
          name: 'ProductScoreHistory recordedAt index',
          sql: `CREATE INDEX IF NOT EXISTS "ProductScoreHistory_recordedAt_idx" ON "ProductScoreHistory"("recordedAt")`,
        },
        {
          name: 'ProductScoreHistory composite index',
          sql: `CREATE INDEX IF NOT EXISTS "ProductScoreHistory_productId_recordedAt_idx" ON "ProductScoreHistory"("productId", "recordedAt")`,
        },
      ]
      
      // Apply each schema change
      for (const change of schemaChanges) {
        try {
          await prisma.$executeRawUnsafe(change.sql)
          console.log(`✅ ${change.name} auto-synced (or already exists)`)
        } catch (error: any) {
          // Check if column already exists (non-fatal)
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            // Column already exists, that's fine
          } else {
            console.warn(`⚠️ ${change.name} auto-sync warning:`, error.message)
          }
        }
      }
    } catch (error) {
      // Don't throw - schema sync is non-critical
      console.warn('⚠️ Schema auto-sync failed (non-critical):', error)
    }
  })()

  return schemaSyncPromise
}

