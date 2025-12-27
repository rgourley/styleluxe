#!/usr/bin/env tsx
/**
 * Quick script to test Prisma queries before using them in production
 * 
 * Usage: npx tsx scripts/test-query.ts
 */

import { prisma } from '../lib/prisma.js'

async function testQuery() {
  try {
    console.log('🧪 Testing query...\n')
    
    // Example query - replace with your actual query
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        // Add your query conditions here
      },
      select: {
        id: true,
        name: true,
        currentScore: true,
        daysTrending: true,
      },
      take: 10,
    })
    
    console.log(`✅ Query successful! Found ${products.length} products`)
    products.forEach(p => {
      console.log(`  - ${p.name}: score=${p.currentScore}, days=${p.daysTrending}`)
    })
    
  } catch (error: any) {
    console.error('❌ Query failed!')
    console.error('Error:', error.message)
    if (error.meta) {
      console.error('Meta:', error.meta)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testQuery()






