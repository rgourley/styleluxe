import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        content: true,
        trendSignals: true,
        reviews: {
          take: 10,
          orderBy: { helpful: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params
    const body = await request.json()

    // Get current product to preserve Amazon URL and check if it has content
    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { 
        amazonUrl: true, 
        name: true,
        status: true,
        content: {
          select: { slug: true }
        }
      },
    })

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.brand !== undefined) updateData.brand = body.brand
    if (body.category !== undefined) updateData.category = body.category
    if (body.price !== undefined) updateData.price = body.price
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
    if (body.amazonUrl !== undefined) updateData.amazonUrl = body.amazonUrl
    if (body.status !== undefined) updateData.status = body.status
    // Preserve Amazon URL if not explicitly provided
    if (body.amazonUrl === undefined) {
      updateData.amazonUrl = currentProduct.amazonUrl
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        content: {
          select: { slug: true }
        }
      }
    })

    // Invalidate cache when product is updated
    // This ensures homepage and product pages show updated data
    revalidatePath('/', 'layout')
    revalidatePath('/trending', 'page')
    
    // Invalidate cache tags used by getProductBySlug
    revalidateTag('products')
    
    // Invalidate brand pages if brand changed
    if (body.brand !== undefined && currentProduct) {
      // Revalidate all brand pages (they'll regenerate on next request)
      revalidatePath('/brands', 'page')
      if (body.brand) {
        const { brandToSlug } = await import('@/lib/brands')
        const brandSlug = brandToSlug(body.brand)
        revalidatePath(`/brands/${brandSlug}`, 'page')
      }
      // Also revalidate old brand if it changed
      if (currentProduct.brand && currentProduct.brand !== body.brand) {
        const { brandToSlug } = await import('@/lib/brands')
        const oldBrandSlug = brandToSlug(currentProduct.brand)
        revalidatePath(`/brands/${oldBrandSlug}`, 'page')
      }
    }
    
    // Invalidate product page if it has content
    if (product.content?.slug) {
      revalidatePath(`/products/${product.content.slug}`)
      revalidateTag(`product-${product.content.slug}`)
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete product (cascades to related records via Prisma schema)
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
