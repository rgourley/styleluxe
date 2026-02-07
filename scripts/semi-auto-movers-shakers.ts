/**
 * Semi-automate Movers & Shakers → product + content.
 *
 * - Runs at most 2 products per day to avoid scraping limits.
 * - Prefers Korean skincare when available.
 * - At start: scrape PDP → resolve name (PDP or Claude if spammy) → pick category → create product → keep reviews/ratings → generate content.
 *
 * Usage: npm run semi-auto:movers-shakers
 * Recommended: run once per day (e.g. cron).
 */

import { prisma } from '../lib/prisma'
import { fetchAmazonMoversAndShakers, type AmazonProduct } from './collect-amazon'
import { scrapeAmazonProductPage } from '../lib/amazon-product-scraper'
import { resolveProductName } from '../lib/resolve-product-name'
import { pickProductCategory } from '../lib/pick-product-category'
import { generateAndSaveContent } from '../lib/generate-content'
import { setFirstDetected } from '../lib/trending-products'
import { isAmazonPlaceholder } from '../lib/image-storage'

const MAX_PRODUCTS_PER_DAY = 2
const DELAY_BETWEEN_SCRAPES_MS = 35_000 // ~35s between PDP scrapes to stay under limits

const KOREAN_SKINCARE_KEYWORDS = [
  'korean',
  'k-beauty',
  'k beauty',
  'cosrx',
  'laneige',
  'innisfree',
  'some by mi',
  'beauty of joseon',
  'joseon',
  'pyunkang',
  'klairs',
  'etude',
  'dr. jart',
  'dr jart',
  'banila',
  'missha',
  'sulwhasoo',
  'snail mucin',
  'centella',
  'cica',
]

function extractASIN(url: string | undefined): string | null {
  if (!url) return null
  const m = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/gp\/product\/([A-Z0-9]{10})/)
  return m ? m[1] : null
}

function scoreKoreanPreference(p: AmazonProduct): number {
  const text = `${(p.name || '').toLowerCase()} ${(p.brand || '').toLowerCase()}`
  return KOREAN_SKINCARE_KEYWORDS.filter((kw) => text.includes(kw)).length
}

/** Count how many products we added today via this semi-auto flow (trend signal metadata.semiAutoAdded) */
async function countSemiAutoAddedToday(): Promise<number> {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)

  const signals = await prisma.trendSignal.findMany({
    where: {
      source: 'amazon_movers',
      detectedAt: { gte: startOfToday },
    },
    select: { metadata: true },
  })

  return signals.filter((s) => (s.metadata as any)?.semiAutoAdded === true).length
}

export type SemiAutoResult = {
  ok: boolean
  added: number
  addedToday: number
  cap: number
  message: string
}

/** Run the semi-auto pipeline (max 2/day). Call from CLI or cron API. */
export async function runSemiAutoMoversShakers(): Promise<SemiAutoResult> {
  const addedToday = await countSemiAutoAddedToday()
  if (addedToday >= MAX_PRODUCTS_PER_DAY) {
    const message = `Already added ${addedToday} products today. Cap is ${MAX_PRODUCTS_PER_DAY}.`
    console.log(message)
    return { ok: true, added: 0, addedToday, cap: MAX_PRODUCTS_PER_DAY, message }
  }

  const products = await fetchAmazonMoversAndShakers()
  if (products.length === 0) {
    console.log('No products from Movers & Shakers.')
    return { ok: true, added: 0, addedToday, cap: MAX_PRODUCTS_PER_DAY, message: 'No products from M&S.' }
  }

  // Score and sort: prefer Korean skincare, then by position
  const scored = products.map((p) => ({
    product: p,
    koreanScore: scoreKoreanPreference(p),
    position: p.position ?? 999,
  }))
  scored.sort((a, b) => {
    if (b.koreanScore !== a.koreanScore) return b.koreanScore - a.koreanScore
    return a.position - b.position
  })

  // Filter out already-existing (by ASIN)
  const existingAsins = new Set<string>()
  const withAsin = scored.filter(({ product }) => {
    const asin = extractASIN(product.amazonUrl)
    if (!asin) return false
    return true
  })

  for (const { product } of withAsin) {
    const asin = extractASIN(product.amazonUrl)!
    const existing = await prisma.product.findFirst({
      where: { amazonUrl: { contains: asin } },
    })
    if (existing) existingAsins.add(asin)
  }

  const candidates = withAsin
    .filter(({ product }) => !existingAsins.has(extractASIN(product.amazonUrl)!))
    .map((s) => s.product)
    .slice(0, MAX_PRODUCTS_PER_DAY - addedToday)

  if (candidates.length === 0) {
    console.log('No new candidates (all already in DB or cap reached).')
    return { ok: true, added: 0, addedToday, cap: MAX_PRODUCTS_PER_DAY, message: 'No new candidates.' }
  }

  console.log(`Processing ${candidates.length} product(s):\n`)
  let added = 0

  for (let i = 0; i < candidates.length; i++) {
    const moversProduct = candidates[i]
    const listingTitle = moversProduct.name
    const amazonUrl = moversProduct.amazonUrl

    if (i > 0) {
      console.log(`Waiting ${DELAY_BETWEEN_SCRAPES_MS / 1000}s before next scrape...`)
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SCRAPES_MS))
    }

    console.log(`[${i + 1}/${candidates.length}] Scraping PDP: ${listingTitle.substring(0, 50)}...`)
    const pdp = await scrapeAmazonProductPage(amazonUrl)
    if (!pdp) {
      console.log('  Skip: could not scrape PDP\n')
      continue
    }

    // 1) Resolve name at the start (PDP or Claude if spammy)
    const displayName = await resolveProductName(listingTitle, pdp.name, pdp.brand)
    console.log(`  Name: "${displayName.substring(0, 60)}${displayName.length > 60 ? '...' : ''}"`)

    // 2) Pick category
    const category = await pickProductCategory(
      displayName,
      pdp.brand,
      pdp.description || (pdp.keyFeatures && pdp.keyFeatures.length ? pdp.keyFeatures.join('. ') : undefined)
    )
    console.log(`  Category: ${category}`)

    // 3) Create product
    let imageUrl = pdp.imageUrl ?? moversProduct.imageUrl ?? null
    if (imageUrl && isAmazonPlaceholder(imageUrl)) imageUrl = null

    const newProduct = await prisma.product.create({
      data: {
        name: displayName,
        brand: pdp.brand ?? moversProduct.brand ?? null,
        price: pdp.price ?? moversProduct.price ?? null,
        imageUrl,
        amazonUrl: pdp.amazonUrl ?? amazonUrl,
        category,
        trendScore: 100,
        status: 'FLAGGED',
        onMoversShakers: true,
        lastSeenOnMoversShakers: new Date(),
      },
    })

    await setFirstDetected(newProduct.id, 100)

    // 4) Trend signal with semiAutoAdded for daily cap
    await prisma.trendSignal.create({
      data: {
        productId: newProduct.id,
        source: 'amazon_movers',
        signalType: 'semi_auto_movers_shakers',
        value: moversProduct.salesJumpPercent ?? 0,
        metadata: {
          semiAutoAdded: true,
          listingTitle: listingTitle.substring(0, 300),
          salesJumpPercent: moversProduct.salesJumpPercent,
          position: moversProduct.position,
          detectedAt: new Date().toISOString(),
        },
      },
    })

    // 5) Metadata (reviews/ratings)
    try {
      if ((prisma as any).productMetadata) {
        await (prisma as any).productMetadata.create({
          data: {
            productId: newProduct.id,
            starRating: pdp.starRating ?? null,
            totalReviewCount: pdp.totalReviewCount ?? null,
            availability: pdp.availability ?? null,
            description: pdp.description ?? null,
            keyFeatures: pdp.keyFeatures ?? [],
          },
        })
      }
    } catch (e) {
      console.warn('  ProductMetadata create failed (non-fatal):', e)
    }

    // 6) Save reviews
    if (pdp.reviews && pdp.reviews.length > 0) {
      for (const r of pdp.reviews.slice(0, 20)) {
        await prisma.review.create({
          data: {
            productId: newProduct.id,
            source: 'AMAZON',
            rating: r.rating,
            title: r.title ?? null,
            content: r.content,
            author: r.author ?? null,
            date: r.date ?? null,
            helpful: r.helpful ?? null,
            verified: r.verified ?? false,
          },
        })
      }
      console.log(`  Saved ${Math.min(pdp.reviews.length, 20)} reviews`)
    }

    // 7) Optional: migrate image to R2 (same as approve-search-result)
    if (imageUrl && (imageUrl.includes('amazon.com') || imageUrl.includes('media-amazon'))) {
      try {
        const { storeAmazonImageInR2, extractASINFromUrl } = await import('../lib/image-storage')
        const asin = extractASINFromUrl(amazonUrl)
        const r2 = await storeAmazonImageInR2(imageUrl, newProduct.id, asin ?? undefined)
        if (r2) {
          await prisma.product.update({
            where: { id: newProduct.id },
            data: { imageUrl: r2 },
          })
        }
      } catch (_) {
        // keep original image on failure
      }
    }

    // 8) Generate content (Claude)
    console.log('  Generating content with Claude...')
    try {
      await generateAndSaveContent(newProduct.id)
      console.log('  Content generated.\n')
    } catch (err) {
      console.error('  Content generation failed:', err)
      console.log('  Product created; you can generate content from admin.\n')
    }
    added++
  }

  console.log('Semi-auto run finished.')
  return {
    ok: true,
    added,
    addedToday: addedToday + added,
    cap: MAX_PRODUCTS_PER_DAY,
    message: `Added ${added} product(s).`,
  }
}

async function main() {
  const result = await runSemiAutoMoversShakers()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
