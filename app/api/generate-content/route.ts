import { NextResponse } from 'next/server'
import { generateAndSaveContent } from '@/lib/generate-content'
import { prisma } from '@/lib/prisma'

// Extend timeout for content generation (can take 30-60 seconds)
export const maxDuration = 60 // 60 seconds for Vercel Pro, 10s default on free tier

export async function POST(request: Request) {
  try {
    const { productId, generateAll } = await request.json()

    if (generateAll) {
      // Generate content for all FLAGGED products that don't have content yet
      const products = await prisma.product.findMany({
        where: {
          status: 'FLAGGED',
          content: null, // No content yet
        },
        take: 10, // Limit to 10 at a time to avoid rate limits
      })

      if (products.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No products need content generation',
          generated: 0,
        })
      }

      const results = []
      for (const product of products) {
        try {
          await generateAndSaveContent(product.id)
          results.push({ productId: product.id, name: product.name, success: true })
          
          // Delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Error generating content for ${product.name}:`, error)
          results.push({
            productId: product.id,
            name: product.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      return NextResponse.json({
        success: true,
        message: `Generated content for ${successCount}/${products.length} products`,
        generated: successCount,
        results,
      })
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'productId is required' },
        { status: 400 }
      )
    }

    console.log(`Starting content generation for product: ${productId}`)
    
    // Add timeout wrapper (55 seconds max to leave buffer for route timeout)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Content generation timed out after 55 seconds'))
      }, 55000)
    })

    await Promise.race([
      generateAndSaveContent(productId),
      timeoutPromise,
    ])

    console.log(`Content generation completed for product: ${productId}`)

    return NextResponse.json({
      success: true,
      message: 'Content generated successfully',
    })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

