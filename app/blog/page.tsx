import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

export const revalidate = 60 // Revalidate every 60 seconds

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Blog - BeautyFinder',
  description: 'Beauty tips, product reviews, and trending beauty insights',
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
}

export default async function BlogPage() {
  const { prisma } = await import('@/lib/prisma')
  
  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
    },
    orderBy: {
      publishedAt: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-4">Blog</h1>
          <p className="text-xl text-[#6b6b6b]">
            Beauty tips, product reviews, and trending insights
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
              >
                {post.featuredImage && (
                  <div className="relative w-full h-48 bg-gray-100">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>{post.author}</span>
                    {post.publishedAt && (
                      <>
                        <span>•</span>
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[#2D2D2D] mb-2 group-hover:text-[#E07856] transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 line-clamp-3">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

