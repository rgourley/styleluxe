/**
 * Run database migration on production
 * This adds the pageViews, clicks, and lastViewedAt columns to the Product table
 */

import { prisma } from '../lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration() {
  console.log('🚀 Running production database migration...\n')

  try {
    // Read the SQL migration file
    const migrationPath = join(process.cwd(), 'prisma', 'migrations', 'add_traffic_tracking.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration SQL:')
    console.log(sql)
    console.log('\n')

    // Execute the migration using Prisma's raw SQL
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        await prisma.$executeRawUnsafe(statement)
        console.log('✅ Success\n')
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('\nThe following columns have been added to the Product table:')
    console.log('  - pageViews (INTEGER, default 0)')
    console.log('  - clicks (INTEGER, default 0)')
    console.log('  - lastViewedAt (TIMESTAMP)')
    console.log('\nIndexes have been created for performance.')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()


