/**
 * Check products currently on Movers & Shakers
 */

import { prisma } from '../lib/prisma'

async function checkCurrentMS() {
  console.log('Checking products CURRENTLY on Movers & Shakers...\n')

  const currentMS = await prisma.product.findMany({
    where: {
      onMoversShakers: true,
    },
    select: {
      name: true,
      baseScore: true,
      currentScore: true,
      daysTrending: true,
      firstDetected: true,
      lastSeenOnMoversShakers: true,
      status: true,
    },
    orderBy: { currentScore: 'desc' },
  })

  console.log(`Products currently on M&S: ${currentMS.length}\n`)

  if (currentMS.length === 0) {
    console.log('❌ No products marked as currently on M&S!\n')
    console.log('This means the last Amazon collection did not find any M&S products.')
    console.log('Run "Run Full Collection" from the admin panel to update.\n')
  } else {
    console.log('Products on M&S:')
    console.log('='.repeat(140))
    for (const p of currentMS) {
      const base = p.baseScore || 0
      const current = p.currentScore || 0
      const days = p.daysTrending || 0
      const detected = p.firstDetected ? p.firstDetected.toISOString().substring(0, 10) : 'N/A'
      const lastSeen = p.lastSeenOnMoversShakers ? p.lastSeenOnMoversShakers.toISOString().substring(0, 10) : 'N/A'
      
      console.log(`${p.name.substring(0, 45).padEnd(47)} | Base: ${base.toString().padStart(3)} | Current: ${current.toString().padStart(3)} | Days: ${days.toString().padStart(2)} | Detected: ${detected} | Last Seen: ${lastSeen} | ${p.status}`)
    }
  }

  // Also check products that were recently on M&S but dropped off
  console.log('\n\nProducts that dropped off M&S (within last 7 days):')
  console.log('='.repeat(140))
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const droppedMS = await prisma.product.findMany({
    where: {
      onMoversShakers: false,
      lastSeenOnMoversShakers: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      name: true,
      baseScore: true,
      currentScore: true,
      daysTrending: true,
      lastSeenOnMoversShakers: true,
      status: true,
    },
    orderBy: { lastSeenOnMoversShakers: 'desc' },
    take: 20,
  })

  if (droppedMS.length === 0) {
    console.log('None found.')
  } else {
    for (const p of droppedMS) {
      const base = p.baseScore || 0
      const current = p.currentScore || 0
      const days = p.daysTrending || 0
      const lastSeen = p.lastSeenOnMoversShakers ? p.lastSeenOnMoversShakers.toISOString().substring(0, 10) : 'N/A'
      
      console.log(`${p.name.substring(0, 45).padEnd(47)} | Base: ${base.toString().padStart(3)} | Current: ${current.toString().padStart(3)} | Days: ${days.toString().padStart(2)} | Last Seen: ${lastSeen} | ${p.status}`)
    }
  }

  await prisma.$disconnect()
}

checkCurrentMS().catch(console.error)

