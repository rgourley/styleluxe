import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params

    // Verify product and content exist
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        content: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product.content) {
      return NextResponse.json(
        { success: false, message: 'Product content not found. Please generate content first.' },
        { status: 400 }
      )
    }

    // Update product status to PUBLISHED
    await prisma.product.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    })

    // Invalidate cache for this product page
    if (product.content?.slug) {
      revalidatePath(`/products/${product.content.slug}`)
      revalidatePath('/') // Also invalidate homepage
      revalidatePath('/trending') // Also invalidate trending page
      
      // Invalidate brand pages if product has a brand
      if (product.brand) {
        const { brandToSlug } = await import('@/lib/brands')
        const brandSlug = brandToSlug(product.brand)
        revalidatePath(`/brands/${brandSlug}`, 'page')
        revalidatePath('/brands', 'page') // Also invalidate brand listing
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product published successfully',
      slug: product.content.slug,
    })
  } catch (error) {
    console.error('Error publishing product:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

