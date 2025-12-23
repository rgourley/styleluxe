import { NextResponse } from 'next/server'
import { scrapeProductData } from '../../../scripts/scrape-amazon-product-data'

export async function POST() {
  try {
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

