#!/usr/bin/env tsx
/**
 * Daily update script to recalculate age decay scores
 * Run this daily via cron job at 6:00 AM
 * 
 * Usage:
 *   tsx scripts/daily-update.ts
 *   or
 *   node --loader tsx scripts/daily-update.ts
 */

import { recalculateAllScores } from '../lib/trending-products'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🔄 Starting daily update...')
  console.log(`Time: ${new Date().toISOString()}\n`)

  try {
    const result = await recalculateAllScores()
    
    console.log(`\n✅ Daily update complete!`)
    console.log(`   - Updated: ${result.updated} products`)
    console.log(`   - Errors: ${result.errors}`)
    
    if (result.errors > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error in daily update:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()






