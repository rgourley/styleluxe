import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    // Test database connection
    await prisma.$connect()
    
    // Try a simple query
    const productCount = await prisma.product.count()
    
    return NextResponse.json({
      success: true,
      connected: true,
      productCount,
      message: `Database connected! Found ${productCount} products.`,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database connection failed',
    }, { status: 500 })
  }
}


