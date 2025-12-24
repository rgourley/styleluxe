import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      revalidateTag(`product-${product.content.slug}`)
      revalidateTag('products') // Also invalidate products list cache
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

