/**
 * Database connection check utility
 * Helps diagnose database connection issues
 */

import { prisma } from './prisma'

export async function checkDatabaseConnection(): Promise<{
  connected: boolean
  error?: string
}> {
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      error: 'DATABASE_URL environment variable is not set',
    }
  }

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    return { connected: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      connected: false,
      error: `Database connection failed: ${errorMessage}`,
    }
  }
}









