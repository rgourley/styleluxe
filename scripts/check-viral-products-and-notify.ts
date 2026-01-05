/**
 * Check for viral products and send email notifications to subscribers
 * 
 * A product is considered "viral" if:
 * - currentScore >= 70 (high trend score)
 * - OR sales spike >= 500%
 * - AND status is PUBLISHED
 * - AND we haven't notified about this product in the last 24 hours
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { prisma } from '../lib/prisma'
import { sendViralProductNotification } from '../lib/email'
import { getSalesSpikePercent } from '../lib/product-utils'

async function checkViralProductsAndNotify() {
  console.log('🔍 Checking for viral products to notify subscribers...\n')

  try {
    // Find products that are viral (score >= 70 or sales spike >= 500%)
    const viralProducts = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { currentScore: { gte: 70 } },
          { trendScore: { gte: 70 } }, // Fallback to trendScore
        ],
      },
      include: {
        content: true,
        trendSignals: {
          orderBy: { detectedAt: 'desc' },
          take: 5,
        },
      },
    })

    console.log(`Found ${viralProducts.length} potential viral products\n`)

    if (viralProducts.length === 0) {
      console.log('✅ No viral products to notify about')
      return
    }

    // Filter to only products we haven't notified about recently
    const productsToNotify = []
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    for (const product of viralProducts) {
      // Check if we've already notified about this product recently
      const recentNotification = await prisma.viralProductNotification.findFirst({
        where: {
          productId: product.id,
          sentAt: {
            gte: oneDayAgo,
          },
        },
      })

      if (recentNotification) {
        console.log(`⏭️  Skipping ${product.name} - already notified in last 24 hours`)
        continue
      }

      // Calculate sales spike percentage (numeric value)
      const amazonSignals = (product.trendSignals || []).filter((s: any) => s.source === 'amazon_movers')
      const salesSpikeSignal = amazonSignals.find((s: any) => 
        s.signalType === 'sales_spike' || (s.metadata as any)?.salesJumpPercent
      )
      const salesSpikePercent = salesSpikeSignal 
        ? (salesSpikeSignal.value || (salesSpikeSignal.metadata as any)?.salesJumpPercent || 0)
        : 0
      
      // Check if it meets viral criteria
      const currentScore = product.currentScore ?? product.trendScore ?? 0
      const isViral = currentScore >= 70 || salesSpikePercent >= 500

      if (isViral) {
        productsToNotify.push({ product, salesSpike: salesSpikePercent })
      }
    }

    console.log(`Found ${productsToNotify.length} new viral products to notify about\n`)

    if (productsToNotify.length === 0) {
      console.log('✅ No new viral products to notify about')
      return
    }

    // Get all verified subscribers
    const subscribers = await prisma.emailSubscription.findMany({
      where: {
        verified: true,
      },
    })

    console.log(`Found ${subscribers.length} verified subscribers\n`)

    if (subscribers.length === 0) {
      console.log('⚠️  No subscribers to notify')
      return
    }

    let totalSent = 0
    let totalFailed = 0

    // Send notifications for each viral product
    for (const { product, salesSpike: salesSpikePercent } of productsToNotify) {
      const productSlug = product.content?.slug || `product-${product.id}`
      
      console.log(`\n📧 Notifying about: ${product.name}`)
      console.log(`   Score: ${product.currentScore ?? product.trendScore ?? 0}`)
      console.log(`   Sales Spike: ${salesSpikePercent > 0 ? `+${salesSpikePercent}%` : 'N/A'}`)

      // Send to all subscribers
      for (const subscriber of subscribers) {
        try {
          const sent = await sendViralProductNotification(subscriber.email, {
            productName: product.name,
            productSlug: productSlug,
            brand: product.brand,
            price: product.price,
            imageUrl: product.imageUrl,
            trendScore: product.currentScore ?? product.trendScore ?? 0,
            salesSpike: salesSpikePercent > 0 ? salesSpikePercent : undefined,
            amazonUrl: product.amazonUrl,
          })

          if (sent) {
            // Record notification
            await prisma.viralProductNotification.create({
              data: {
                productId: product.id,
                productName: product.name,
                email: subscriber.email,
                score: product.currentScore ?? product.trendScore ?? 0,
              },
            })

            // Update subscriber stats
            await prisma.emailSubscription.update({
              where: { id: subscriber.id },
              data: {
                lastNotifiedAt: new Date(),
                notificationCount: {
                  increment: 1,
                },
              },
            })

            totalSent++
            console.log(`   ✅ Sent to ${subscriber.email}`)
          } else {
            totalFailed++
            console.log(`   ❌ Failed to send to ${subscriber.email}`)
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error: any) {
          console.error(`   ❌ Error sending to ${subscriber.email}:`, error.message)
          totalFailed++
        }
      }
    }

    console.log('\n📊 Notification Summary:')
    console.log(`✅ Sent: ${totalSent}`)
    console.log(`❌ Failed: ${totalFailed}`)
    console.log(`\n✅ Done!`)
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkViralProductsAndNotify()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

