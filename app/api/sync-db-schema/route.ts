import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Sync database schema by adding missing columns
 * Uses raw SQL since Vercel doesn't allow running npx commands
 */
export async function POST() {
  try {
    console.log('🚀 Running database schema sync...')
    
    const results = []
    
    // Add previousSlugs column to ProductContent if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "previousSlugs" JSONB;
      `)
      results.push('✅ previousSlugs column added to ProductContent (or already exists)')
      console.log('✅ previousSlugs column added (or already exists)')
    } catch (error: any) {
      // Check if column already exists (non-fatal)
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        results.push('ℹ️ previousSlugs column already exists')
      } else {
        results.push(`⚠️ previousSlugs column: ${error.message}`)
        console.warn('previousSlugs column check:', error.message)
      }
    }
    
    // Verify the column was added by checking if we can query it
    try {
      await prisma.$queryRawUnsafe(`
        SELECT "previousSlugs" FROM "ProductContent" LIMIT 1;
      `)
      results.push('✅ previousSlugs column verified and accessible')
    } catch (error: any) {
      // This is expected if the column doesn't exist yet, but we tried to add it above
      results.push(`⚠️ previousSlugs column verification: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database schema sync completed!',
      results,
      note: 'Prisma client will automatically recognize the new column on next deployment or restart',
    })
  } catch (error: any) {
    console.error('❌ Schema sync error:', error)
    
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

export async function GET() {
  return POST()
}

