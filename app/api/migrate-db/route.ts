import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { requireAdmin } from '@/lib/auth-utils'

const execAsync = promisify(exec)

export async function POST() {
  // Check authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    console.log('Running database migration...')
    
    // First, try to resolve drift by using db push (safer for existing databases)
    // This will sync the schema without creating migration files
    try {
      console.log('Syncing schema with database (db push)...')
      const { stdout: pushStdout, stderr: pushStderr } = await execAsync('npx prisma db push --accept-data-loss', {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      })
      console.log('Schema push output:', pushStdout)
      if (pushStderr) {
        console.warn('Schema push warnings:', pushStderr)
      }
    } catch (pushError: any) {
      console.warn('Schema push failed, trying migrate dev:', pushError.message)
      
      // If db push fails, try migrate dev
      try {
        const { stdout, stderr } = await execAsync('npx prisma migrate dev --name add-product-metadata --create-only', {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
        })
        console.log('Migration create output:', stdout)
        
        // Now apply the migration
        const { stdout: applyStdout } = await execAsync('npx prisma migrate deploy', {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
        })
        console.log('Migration apply output:', applyStdout)
      } catch (migrateError: any) {
        // If that fails, try to resolve drift
        if (migrateError.message?.includes('Drift detected') || migrateError.message?.includes('not in sync')) {
          console.log('Attempting to resolve drift...')
          // Try to mark current state as baseline
          try {
            await execAsync('npx prisma migrate resolve --applied $(ls -t prisma/migrations | head -1)', {
              cwd: process.cwd(),
              maxBuffer: 10 * 1024 * 1024,
            })
          } catch (resolveError) {
            console.warn('Could not resolve drift automatically')
          }
        }
        throw migrateError
      }
    }
    
    // Generate Prisma client
    await execAsync('npx prisma generate', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Database schema synced successfully',
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    
    // Check if migration already exists (non-fatal)
    if (error.message?.includes('already exists') || error.message?.includes('No changes detected')) {
      return NextResponse.json({
        success: true,
        message: 'Migration already applied or no changes detected',
        warning: error.message,
      })
    }
    
    // If drift is detected, suggest using db push instead
    if (error.message?.includes('Drift detected') || error.message?.includes('not in sync')) {
      return NextResponse.json({
        success: false,
        message: 'Database schema drift detected. Please use "db push" to sync schema, or resolve drift manually.',
        error: error.stdout || error.stderr || error.message,
        suggestion: 'Run: npx prisma db push --accept-data-loss',
      }, { status: 500 })
    }
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error.stdout || error.stderr || error.message,
      },
      { status: 500 }
    )
  }
}

