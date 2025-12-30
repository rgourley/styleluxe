import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Sync database schema to match Prisma schema exactly
 * Uses raw SQL to add all missing columns and indexes
 * This ensures production database matches localhost/dev
 */
export async function POST() {
  // Check authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    console.log('🚀 Running full database schema sync to match Prisma schema...')
    
    const results = []
    const errors = []
    
    // List of all schema changes that need to be applied
    const schemaChanges = [
      {
        name: 'previousSlugs column in ProductContent',
        sql: `ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "previousSlugs" JSONB;`,
        verify: `SELECT "previousSlugs" FROM "ProductContent" LIMIT 1;`,
      },
      {
        name: 'images column in ProductContent',
        sql: `ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "images" JSONB;`,
        verify: `SELECT "images" FROM "ProductContent" LIMIT 1;`,
      },
      // Add any other missing columns here as schema evolves
    ]
    
    // Apply each schema change
    for (const change of schemaChanges) {
      try {
        await prisma.$executeRawUnsafe(change.sql)
        results.push(`✅ ${change.name} added (or already exists)`)
        console.log(`✅ ${change.name} added (or already exists)`)
        
        // Verify it was added
        try {
          await prisma.$queryRawUnsafe(change.verify)
          results.push(`✅ ${change.name} verified and accessible`)
        } catch (verifyError: any) {
          // Verification might fail if table is empty, which is okay
          if (verifyError.message?.includes('does not exist')) {
            errors.push(`⚠️ ${change.name} verification failed: column may not exist`)
          }
        }
      } catch (error: any) {
        // Check if column already exists (non-fatal)
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          results.push(`ℹ️ ${change.name} already exists`)
        } else {
          const errorMsg = `⚠️ ${change.name}: ${error.message}`
          errors.push(errorMsg)
          results.push(errorMsg)
          console.warn(`${change.name} error:`, error.message)
        }
      }
    }
    
    // Check current schema state
    try {
      const productContentColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ProductContent' 
        ORDER BY column_name;
      `)
      const columnNames = productContentColumns.map(c => c.column_name)
      results.push(`📊 ProductContent columns: ${columnNames.join(', ')}`)
      
      // Check if previousSlugs exists
      if (columnNames.includes('previousSlugs')) {
        results.push('✅ previousSlugs column confirmed in database')
      } else {
        errors.push('❌ previousSlugs column NOT found in database - migration may have failed')
      }
      
      // Check if images exists
      if (columnNames.includes('images')) {
        results.push('✅ images column confirmed in database')
      } else {
        errors.push('❌ images column NOT found in database - migration may have failed')
      }
    } catch (error: any) {
      errors.push(`⚠️ Could not verify schema state: ${error.message}`)
    }
    
    const hasErrors = errors.length > 0 && errors.some(e => e.startsWith('❌'))
    
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Schema sync completed with errors - check results' 
        : 'Database schema sync completed successfully!',
      results,
      errors: errors.length > 0 ? errors : undefined,
      note: 'Prisma client will recognize new columns after next deployment. You can now use content: true in queries.',
    })
  } catch (error: any) {
    console.error('❌ Schema sync error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}

