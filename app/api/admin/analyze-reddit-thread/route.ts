import { NextResponse } from 'next/server'
import { scrapeRedditThread } from '@/scripts/scrape-reddit-thread'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

interface ProductMatch {
  productMention: {
    productName: string
    context: string
    source: string
    author?: string
    score?: number
    amazonUrl?: string
  }
  amazonMatch: {
    name: string
    brand?: string
    price?: number
    imageUrl?: string
    amazonUrl: string
    rating?: number
    reviewCount?: number
  } | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  existingProduct?: {
    id: string
    name: string
    status: string
    currentScore: number | null
  } | null
}

/**
 * POST /api/admin/analyze-reddit-thread
 * Analyzes a Reddit thread URL and extracts product mentions (NO Amazon searches - user selects which to search)
 */
export async function POST(request: Request) {
  // Check authentication
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { redditUrl } = await request.json()

    if (!redditUrl || typeof redditUrl !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Reddit URL is required' },
        { status: 400 }
      )
    }

    // Validate Reddit URL format
    if (!redditUrl.includes('reddit.com') || !redditUrl.includes('/comments/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid Reddit URL format' },
        { status: 400 }
      )
    }

    console.log(`🔍 Analyzing Reddit thread: ${redditUrl}`)

    // Scrape the Reddit thread
    const { thread, productMentions } = await scrapeRedditThread(redditUrl)

    if (!thread) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch Reddit thread. Please check the URL.' },
        { status: 400 }
      )
    }

    if (productMentions.length === 0) {
      return NextResponse.json({
        success: true,
        thread: {
          title: thread.title,
          subreddit: thread.subreddit,
          score: thread.score,
          num_comments: thread.num_comments,
          url: thread.url,
        },
        matches: [],
        message: 'No product mentions found in this thread.',
      })
    }

    console.log(`📦 Found ${productMentions.length} product mentions`)

    // Extract product mentions and check for existing products (NO Amazon searches)
    // User will select which ones to search Amazon for
    const matches: ProductMatch[] = []
    
    for (const mention of productMentions) {
      let existingProduct = null
      
      // Check if product already exists in database (by name or Amazon URL if present)
      if (mention.amazonUrl) {
        try {
          const existing = await prisma.product.findFirst({
            where: {
              amazonUrl: {
                contains: mention.amazonUrl,
              },
            },
            select: {
              id: true,
              name: true,
              status: true,
              currentScore: true,
            },
          })
          
          if (existing) {
            existingProduct = existing
            console.log(`  ✅ Found existing product: ${existing.name}`)
          }
        } catch (error) {
          console.error(`Error checking existing product:`, error)
        }
      } else {
        // Check by name
        try {
          const existing = await prisma.product.findFirst({
            where: {
              name: {
                contains: mention.productName,
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
              name: true,
              status: true,
              currentScore: true,
            },
          })
          
          if (existing) {
            existingProduct = existing
            console.log(`  ✅ Found existing product: ${existing.name}`)
          }
        } catch (error) {
          console.error(`Error checking existing product:`, error)
        }
      }

      matches.push({
        productMention: mention,
        amazonMatch: null, // No Amazon search yet - user will select which ones to search
        confidence: 'none',
        existingProduct,
      })
    }
    
    console.log(`✅ Extracted ${matches.length} product mentions (no Amazon searches - user will select)`)
    const existingCount = matches.filter(m => m.existingProduct).length
    console.log(`   ${existingCount} already exist in database`)

    return NextResponse.json({
      success: true,
      thread: {
        title: thread.title,
        subreddit: thread.subreddit,
        score: thread.score,
        num_comments: thread.num_comments,
        url: thread.url,
      },
      matches,
      message: `Found ${productMentions.length} product mentions. Select which ones to search Amazon for.`,
    })
  } catch (error) {
    console.error('Error analyzing Reddit thread:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to analyze Reddit thread',
      },
      { status: 500 }
    )
  }
}
