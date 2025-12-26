import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Run the traffic tracking migration on production
 * Adds pageViews, clicks, and lastViewedAt columns to Product table
 */
export async function POST() {
  try {
    console.log('🚀 Running traffic tracking migration...')

    // Run the migration SQL directly
    const migrationSQL = `
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "pageViews" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "clicks" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3);
      
      CREATE INDEX IF NOT EXISTS "Product_pageViews_idx" ON "Product"("pageViews");
      CREATE INDEX IF NOT EXISTS "Product_clicks_idx" ON "Product"("clicks");
    `

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results = []
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 60)}...`)
        await prisma.$executeRawUnsafe(statement)
        results.push(`✅ ${statement.substring(0, 60)}...`)
      }
    }

    // Regenerate Prisma client to recognize new columns
    console.log('Regenerating Prisma client...')
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    try {
      await execAsync('npx prisma generate', {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      })
      results.push('✅ Prisma client regenerated')
    } catch (generateError) {
      console.warn('Prisma generate warning (may need manual regeneration):', generateError)
      results.push('⚠️ Prisma client regeneration skipped (may need manual run)')
    }

    return NextResponse.json({
      success: true,
      message: 'Traffic tracking migration completed successfully!',
      results,
      columnsAdded: ['pageViews', 'clicks', 'lastViewedAt'],
      indexesCreated: ['Product_pageViews_idx', 'Product_clicks_idx'],
    })
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    
    // Check if columns already exist (non-fatal)
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      return NextResponse.json({
        success: true,
        message: 'Migration already applied - columns may already exist',
        warning: error.message,
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error.message,
      },
      { status: 500 }
    )
  }
}

