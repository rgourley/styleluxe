import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { slug } = await params

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Blog post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { prisma } = await import('@/lib/prisma')
    const { slug } = await params
    const body = await request.json()

    // Get current post
    const currentPost = await prisma.blogPost.findUnique({
      where: { slug },
    })

    if (!currentPost) {
      return NextResponse.json(
        { success: false, message: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt
    if (body.featuredImage !== undefined) updateData.featuredImage = body.featuredImage
    if (body.author !== undefined) updateData.author = body.author
    if (body.status !== undefined) {
      updateData.status = body.status
      // Set publishedAt when status changes to PUBLISHED
      if (body.status === 'PUBLISHED' && currentPost.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date()
      }
    }

    // Handle slug change (generate unique slug if title changed)
    if (body.title !== undefined && body.title !== currentPost.title) {
      const { generateSlug, generateUniqueBlogSlug } = await import('@/lib/utils')
      const newSlug = await generateUniqueBlogSlug(generateSlug(body.title), currentPost.id)
      updateData.slug = newSlug
    }

    const post = await prisma.blogPost.update({
      where: { slug },
      data: updateData,
    })

    // Revalidate blog pages
    revalidatePath('/blog')
    revalidatePath(`/blog/${currentPost.slug}`)
    if (updateData.slug) {
      revalidatePath(`/blog/${updateData.slug}`)
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Error updating blog post:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update blog post',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { prisma } = await import('@/lib/prisma')
    const { slug } = await params

    await prisma.blogPost.delete({
      where: { slug },
    })

    // Revalidate blog pages
    revalidatePath('/blog')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete blog post',
      },
      { status: 500 }
    )
  }
}

