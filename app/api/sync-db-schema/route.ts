import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

/**
 * Sync database schema using db push (safer for existing databases with drift)
 * This will sync the Prisma schema to the database without creating migration files
 */
export async function POST() {
  try {
    console.log('Syncing database schema (db push)...')
    
    // Use db push to sync schema - this is safer for existing databases
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })
    
    console.log('Schema sync output:', stdout)
    if (stderr) {
      console.warn('Schema sync warnings:', stderr)
    }
    
    // Generate Prisma client (critical - must be done after schema sync)
    console.log('Generating Prisma client...')
    const { stdout: generateStdout, stderr: generateStderr } = await execAsync('npx prisma generate', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })
    
    console.log('Prisma client generation output:', generateStdout)
    if (generateStderr) {
      console.warn('Prisma client generation warnings:', generateStderr)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database schema synced successfully and Prisma client regenerated',
      output: stdout,
      generateOutput: generateStdout,
    })
  } catch (error: any) {
    console.error('Schema sync error:', error)
    
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

