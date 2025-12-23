import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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


