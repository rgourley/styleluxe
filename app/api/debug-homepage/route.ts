import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check why products aren't showing on homepage
 */
export async function GET() {
  try {
    // Check total products
    const totalProducts = await prisma.product.count()
    
    // Check published products
    const publishedProducts = await prisma.product.count({
      where: { status: 'PUBLISHED' }
    })
    
    // Check products with content
    const productsWithContent = await prisma.product.count({
      where: {
        status: 'PUBLISHED',
        content: { isNot: null }
      }
    })
    
    // Check products meeting homepage criteria
    const homepageProducts = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        content: { isNot: null },
        AND: [
          {
            OR: [
              { currentScore: { gte: 70 } },
              {
                AND: [
                  { currentScore: null },
                  { trendScore: { gte: 70 } },
                ],
              },
            ],
          },
          {
            OR: [
              { daysTrending: { lte: 7 } },
              { daysTrending: null },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        currentScore: true,
        trendScore: true,
        daysTrending: true,
        content: {
          select: {
            slug: true
          }
        }
      },
      take: 10,
    })
    
    // Get sample products to see their status
    const sampleProducts = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        currentScore: true,
        trendScore: true,
        daysTrending: true,
        baseScore: true,
        content: {
          select: {
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      summary: {
        totalProducts,
        publishedProducts,
        productsWithContent,
        homepageProductsCount: homepageProducts.length,
      },
      homepageProducts: homepageProducts.map(p => ({
        name: p.name,
        status: p.status,
        currentScore: p.currentScore,
        trendScore: p.trendScore,
        daysTrending: p.daysTrending,
        hasContent: !!p.content,
        slug: p.content?.slug || null,
      })),
      sampleProducts: sampleProducts.map(p => ({
        name: p.name,
        status: p.status,
        currentScore: p.currentScore,
        trendScore: p.trendScore,
        baseScore: p.baseScore,
        daysTrending: p.daysTrending,
        hasContent: !!p.content,
        slug: p.content?.slug || null,
      })),
      issues: [
        ...(publishedProducts === 0 ? ['❌ No products are PUBLISHED'] : []),
        ...(productsWithContent === 0 ? ['❌ No PUBLISHED products have content (slug)'] : []),
        ...(homepageProducts.length === 0 && productsWithContent > 0 ? ['❌ No products meet homepage criteria (currentScore >= 70 or trendScore >= 70, daysTrending <= 7)'] : []),
      ],
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}


