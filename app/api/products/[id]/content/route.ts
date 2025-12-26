import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params
    const body = await request.json()

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Update specific fields (allows partial updates)
    const updateData: any = {}
    if (body.slug !== undefined) updateData.slug = body.slug // Allow slug updates
    if (body.previousSlugs !== undefined) updateData.previousSlugs = body.previousSlugs // Allow previousSlugs updates
    if (body.hook !== undefined) updateData.hook = body.hook
    if (body.whyTrending !== undefined) updateData.whyTrending = body.whyTrending
    if (body.whatItDoes !== undefined) updateData.whatItDoes = body.whatItDoes
    if (body.theGood !== undefined) updateData.theGood = body.theGood
    if (body.theBad !== undefined) updateData.theBad = body.theBad
    if (body.whoShouldTry !== undefined) updateData.whoShouldTry = body.whoShouldTry
    if (body.whoShouldSkip !== undefined) updateData.whoShouldSkip = body.whoShouldSkip
    if (body.alternatives !== undefined) updateData.alternatives = body.alternatives
    if (body.whatRealUsersSay !== undefined) updateData.whatRealUsersSay = body.whatRealUsersSay
    if (body.editorNotes !== undefined) updateData.editorNotes = body.editorNotes
    if (body.redditHotness !== undefined) updateData.redditHotness = body.redditHotness
    if (body.googleTrendsData !== undefined) updateData.googleTrendsData = body.googleTrendsData
    if (body.faq !== undefined) updateData.faq = body.faq
    if (body.editedByHuman !== undefined) updateData.editedByHuman = body.editedByHuman

    // Update or create content
    const content = await prisma.productContent.upsert({
      where: { productId: id },
      update: {
        ...updateData,
        updatedAt: new Date(),
      },
      create: {
        productId: id,
        slug: body.slug || product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        previousSlugs: body.previousSlugs || null,
        hook: body.hook || null,
        whyTrending: body.whyTrending || null,
        whatItDoes: body.whatItDoes || null,
        theGood: body.theGood || null,
        theBad: body.theBad || null,
        whoShouldTry: body.whoShouldTry || null,
        whoShouldSkip: body.whoShouldSkip || null,
        alternatives: body.alternatives || null,
        whatRealUsersSay: body.whatRealUsersSay || null,
        editorNotes: body.editorNotes || null,
        redditHotness: body.redditHotness || null,
        googleTrendsData: body.googleTrendsData || null,
        faq: body.faq || [],
        editedByHuman: body.editedByHuman || false,
      },
    })

    // Update product status to DRAFT if content was edited
    if (body.editedByHuman) {
      await prisma.product.update({
        where: { id },
        data: {
          status: 'DRAFT',
        },
      })
    }

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Lazy load prisma to prevent build-time execution
    const { prisma } = await import('@/lib/prisma')
    
    const { id } = await params
    const body = await request.json()

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Update or create content (full replace)
    const content = await prisma.productContent.upsert({
      where: { productId: id },
      update: {
        hook: body.hook,
        whyTrending: body.whyTrending,
        whatItDoes: body.whatItDoes,
        theGood: body.theGood,
        theBad: body.theBad,
        whoShouldTry: body.whoShouldTry,
        whoShouldSkip: body.whoShouldSkip,
        alternatives: body.alternatives,
        whatRealUsersSay: body.whatRealUsersSay,
        editorNotes: body.editorNotes,
        redditHotness: body.redditHotness !== undefined ? body.redditHotness : undefined,
        googleTrendsData: body.googleTrendsData !== undefined ? body.googleTrendsData : undefined,
        faq: body.faq || [],
        editedByHuman: body.editedByHuman || false,
        updatedAt: new Date(),
      },
      create: {
        productId: id,
        slug: body.slug || product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        hook: body.hook,
        whyTrending: body.whyTrending,
        whatItDoes: body.whatItDoes,
        theGood: body.theGood,
        theBad: body.theBad,
        whoShouldTry: body.whoShouldTry,
        whoShouldSkip: body.whoShouldSkip,
        alternatives: body.alternatives,
        whatRealUsersSay: body.whatRealUsersSay,
        editorNotes: body.editorNotes,
        redditHotness: body.redditHotness || null,
        googleTrendsData: body.googleTrendsData || null,
        faq: body.faq || [],
        editedByHuman: body.editedByHuman || false,
      },
    })

    // Update product status to DRAFT if content was edited
    if (body.editedByHuman) {
      await prisma.product.update({
        where: { id },
        data: {
          status: 'DRAFT',
        },
      })
    }

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
