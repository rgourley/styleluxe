import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Lazy load script to prevent build-time execution
    const { scrapeProductData } = await import('../../../scripts/scrape-amazon-product-data')
    
    console.log('Starting Amazon product data scraping...')
    
    // Run the scraping script
    await scrapeProductData()
    
    return NextResponse.json({
      success: true,
      message: 'Amazon product data scraping completed successfully',
    })
  } catch (error) {
    console.error('Amazon scraping error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

