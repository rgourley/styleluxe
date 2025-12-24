import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateProductContent } from '@/lib/generate-content'
import { searchRedditForQuotes } from '@/lib/search-reddit-quotes'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

/**
 * Regenerate a single section of product content using Claude AI
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { section } = await request.json()

    if (!section || typeof section !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Section name is required' },
        { status: 400 }
      )
    }

    const validSections = [
      'hook',
      'whyTrending',
      'whatItDoes',
      'theGood',
      'theBad',
      'whoShouldTry',
      'whoShouldSkip',
      'alternatives',
      'whatRealUsersSay',
    ]

    if (!validSections.includes(section)) {
      return NextResponse.json(
        { success: false, message: `Invalid section: ${section}` },
        { status: 400 }
      )
    }

    // Fetch product with all relations
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        trendSignals: true,
        reviews: {
          take: 50,
          orderBy: [
            { helpful: 'desc' },
            { rating: 'desc' },
          ],
        },
        content: true,
        metadata: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Fetch questions separately
    let questions: any[] = []
    try {
      // @ts-ignore
      if (prisma.productQuestion) {
        // @ts-ignore
        questions = await prisma.productQuestion.findMany({
          where: { productId: product.id },
          take: 10,
          orderBy: { helpful: 'desc' },
        })
      }
    } catch (error) {
      // Questions table doesn't exist yet
    }

    // Get Reddit quotes if needed
    let redditQuotes: Array<{ text: string; sentiment: 'positive' | 'negative' | 'neutral'; upvotes: number; subreddit: string }> = []
    if (section === 'whyTrending' || section === 'theGood' || section === 'theBad' || section === 'whatRealUsersSay') {
      try {
        redditQuotes = await searchRedditForQuotes(product.name, product.brand || undefined)
      } catch (error) {
        console.log('Reddit search failed, continuing without quotes')
      }
    }

    // Prepare product data for content generation
    const productData = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      amazonUrl: product.amazonUrl,
      trendSignals: product.trendSignals,
      reviews: product.reviews.map(r => ({
        rating: r.rating,
        content: r.content,
        author: r.author,
        verified: r.verified,
        helpful: r.helpful,
      })),
      metadata: product.metadata ? {
        starRating: product.metadata.starRating,
        totalReviewCount: product.metadata.totalReviewCount,
        positiveThemes: product.metadata.positiveThemes as string[] | null,
        negativeThemes: product.metadata.negativeThemes as string[] | null,
        specificDetails: product.metadata.specificDetails as {
          skinTypes?: string[]
          useCases?: string[]
          timeframes?: string[]
        } | null,
        memorableQuotes: product.metadata.memorableQuotes as string[] | null,
      } : null,
      questions: questions.map(q => ({
        question: q.question,
        answer: q.answer,
      })),
      content: product.content,
    }

    // Generate full content (we'll extract just the section we need)
    const generatedContent = await generateProductContent(
      productData,
      redditQuotes.length > 0 ? redditQuotes : undefined,
      product.content?.editorNotes || null,
      product.content?.googleTrendsData || null
    )

    // Extract just the requested section
    const sectionContent = generatedContent[section as keyof typeof generatedContent] as string

    if (!sectionContent) {
      return NextResponse.json(
        { success: false, message: `Failed to generate ${section}` },
        { status: 500 }
      )
    }

    // Update only this section in the database
    await prisma.productContent.update({
      where: { productId: id },
      data: {
        [section]: sectionContent,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      section,
      content: sectionContent,
      message: `${section} regenerated successfully`,
    })
  } catch (error) {
    console.error('Error regenerating section:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

