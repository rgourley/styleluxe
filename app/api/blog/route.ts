import { NextResponse } from 'next/server'
import { generateSlug, generateUniqueBlogSlug } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 60 // Cache for 60 seconds

export async function GET(request: Request) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // DRAFT, PUBLISHED, or null for published only
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }
    // If status is 'ALL' or null, don't filter by status (show all posts)

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: {
        publishedAt: 'desc', // Newest first
      },
      take: limit,
    })

    return NextResponse.json({ success: true, posts })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { requireAdmin } = await import('@/lib/auth-utils')
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { prisma } = await import('@/lib/prisma')
    const body = await request.json()

    // Generate unique slug
    const baseSlug = body.slug || generateSlug(body.title)
    const slug = await generateUniqueBlogSlug(baseSlug)

    // Create blog post
    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        content: body.content || '',
        excerpt: body.excerpt || null,
        featuredImage: body.featuredImage || null,
        author: body.author || 'BeautyFinder Team',
        status: body.status || 'DRAFT',
        publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create blog post',
      },
      { status: 500 }
    )
  }
}

