import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import Anthropic from '@anthropic-ai/sdk'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Extract ASIN from Amazon URL
 */
function extractASIN(amazonUrl: string | null): string | null {
  if (!amazonUrl) return null
  const match = amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
  return match ? match[1] : null
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { topic, wordCount = 1000 } = await request.json()

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { success: false, message: 'Topic is required' },
        { status: 400 }
      )
    }

    // Query database for relevant products
    const { prisma } = await import('@/lib/prisma')
    
    // Search products by name/brand that might be relevant to the topic
    const searchTerms = topic.toLowerCase().split(/\s+/).filter((term: string) => term.length > 2)
    const products = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { name: { contains: searchTerms[0] || topic, mode: 'insensitive' } },
          { brand: { contains: searchTerms[0] || topic, mode: 'insensitive' } },
          { category: { contains: searchTerms[0] || topic, mode: 'insensitive' } },
        ],
      },
      include: {
        content: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        currentScore: 'desc',
      },
      take: 10, // Get top 10 most relevant products
    })

    // Format products for the prompt
    let productsContext = ''
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG || 'enduranceonli-20'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

    if (products.length > 0) {
      productsContext = '\n**PRODUCTS FROM BEAUTYFINDER DATABASE:**\n'
      productsContext += `You have access to ${products.length} relevant products from the BeautyFinder database. Use 3-5 of these products naturally throughout the article.\n\n`

      for (const product of products.slice(0, 5)) {
        const productSlug = product.content?.slug
        const productUrl = productSlug 
          ? `${siteUrl}/products/${productSlug}`
          : product.amazonUrl 
            ? addAmazonAffiliateTag(product.amazonUrl)
            : null

        if (productUrl) {
          const priceText = product.price ? `$${product.price.toFixed(2)}` : 'price varies'
          productsContext += `- **${product.name}**${product.brand ? ` (${product.brand})` : ''} - ${priceText} - ${productUrl}\n`
        }
      }

      productsContext += '\n**CRITICAL:** For products listed above, use the BeautyFinder links (preferred). Only use Amazon links if a product is NOT in the database.\n'
    } else {
      productsContext = '\n**NOTE:** No products found in the BeautyFinder database for this topic. You can reference products with Amazon links when needed (format: https://www.amazon.com/dp/[ASIN]/?tag=' + associateTag + ')\n'
    }

    // Build the prompt based on user's style guide
    const prompt = `You have access to the BeautyFinder product database. Query it to find relevant products for this article.

Write a professional beauty industry article about "${topic}" for BeautyFinder's informed audience.

PRODUCT SELECTION:
- Query the database for products relevant to "${topic}"
- Prioritize products with: recent data, strong trends, or relevant to the article angle
- Use 3-5 products naturally throughout the article
- Link to BeautyFinder product pages: ${siteUrl}/products/[product-slug]
- For products NOT in database, use Amazon links: https://www.amazon.com/dp/[ASIN]/?tag=${associateTag} and include current price
${productsContext}
CRITICAL - Avoid these AI patterns:
- No "it's not just X, it's Y" constructions
- Maximum one em dash in the entire piece
- No rhetorical questions ("Why does this matter?" "What's driving this?")
- Ban these phrases: "here's the thing," "the reality is," "here's what's interesting," "the key takeaway," "but here's why that matters"
- Don't organize anything in threes (three benefits, three reasons, three trends)
- Never start consecutive sentences the same way
- No "In recent months/years" or "The beauty industry has seen"
- Cut all hedging: "may," "could," "potentially," "it's worth noting"

Structure:
- Lead with the most interesting data point or observation immediately
- Let facts carry the narrative - state what happened, show the numbers
- Use short paragraphs (2-4 sentences) but vary the rhythm
- Weave product mentions naturally into the analysis, not as a separate list
- End when you've made the point - no summary paragraph

Tone:
- Direct and data-driven like you're briefing someone smart
- Use industry terms correctly but don't explain basics
- Occasional contractions fine (don't, it's, we've)
- Commit to your point of view through word choice (surged vs increased, collapsed vs declined)

Data integration:
- Weave numbers into sentences naturally: "The serum hit #23 on Amazon after sitting at #340 for months"
- Reference timeframes specifically: "last Tuesday" not "recently"
- Compare concrete numbers, don't just say "significant growth"

Topic: ${topic}

Word count: ${wordCount}

Write the article now. No preamble, just start with the content.`

    const modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    
    console.log(`Generating blog post about: ${topic}`)
    const startTime = Date.now()
    
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const duration = Date.now() - startTime
    console.log(`Blog post generation completed in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(
        { success: false, message: 'Unexpected response format from AI' },
        { status: 500 }
      )
    }

    const generatedContent = content.text

    return NextResponse.json({
      success: true,
      content: generatedContent,
    })
  } catch (error) {
    console.error('Error generating blog post:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate blog post',
      },
      { status: 500 }
    )
  }
}

