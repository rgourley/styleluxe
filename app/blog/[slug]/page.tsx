import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MarkdownContent from '@/components/MarkdownContent'

export const revalidate = 60

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { prisma } = await import('@/lib/prisma')
  
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  })

  if (!post || post.status !== 'PUBLISHED') {
    return {
      title: 'Post Not Found - BeautyFinder',
    }
  }

  const title = `${post.title} - BeautyFinder Blog`
  const description = post.excerpt || post.title
  const imageUrl = post.featuredImage || `${siteUrl}/images/unsplash-image-4nulm-JUYFo.webp`

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/blog/${slug}`,
      siteName: 'BeautyFinder',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export async function generateStaticParams() {
  const { prisma } = await import('@/lib/prisma')
  
  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
    },
    select: {
      slug: true,
    },
    take: 50, // Pre-generate top 50 posts
  })

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { prisma } = await import('@/lib/prisma')
  
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  })

  if (!post || post.status !== 'PUBLISHED') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      <Header />
      
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-gray-600">
          <Link href="/" className="hover:text-[#E07856]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-[#E07856]">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{post.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>{post.author}</span>
            {post.publishedAt && (
              <>
                <span>•</span>
                <time dateTime={post.publishedAt.toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="relative w-full h-96 md:h-[500px] mb-12 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <MarkdownContent content={post.content} />
        </div>

        {/* Back to Blog */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/blog"
            className="text-[#E07856] hover:text-[#c86547] font-medium"
          >
            ← Back to Blog
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  )
}

