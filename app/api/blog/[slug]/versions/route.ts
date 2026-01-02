import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { prisma } = await import('@/lib/prisma')
    const { slug } = await params

    // Get the blog post
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Get all versions
    const versions = await prisma.blogPostVersion.findMany({
      where: { blogPostId: post.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { prisma } = await import('@/lib/prisma')
    const { slug } = await params
    const body = await request.json()

    // Get the blog post
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Restore version
    if (body.versionId) {
      const version = await prisma.blogPostVersion.findUnique({
        where: { id: body.versionId },
      })

      if (!version || version.blogPostId !== post.id) {
        return NextResponse.json(
          { success: false, message: 'Version not found' },
          { status: 404 }
        )
      }

      // Update the post with version content
      await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          content: version.content,
          title: version.title || undefined,
          excerpt: version.excerpt || undefined,
        },
      })

      return NextResponse.json({ success: true, message: 'Version restored' })
    }

    return NextResponse.json(
      { success: false, message: 'versionId is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error restoring version:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to restore version' },
      { status: 500 }
    )
  }
}

