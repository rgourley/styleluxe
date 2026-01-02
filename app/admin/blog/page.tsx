'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featuredImage: string | null
  author: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminBlogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPosts()
    }
  }, [status, filterStatus])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus)
      }
      const response = await fetch(`/api/blog?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        fetchPosts()
      } else {
        alert(`Failed to delete: ${data.message}`)
      }
    } catch (error) {
      alert('Error deleting post')
    }
  }

  const handleTogglePublish = async (slug: string, currentStatus: 'DRAFT' | 'PUBLISHED') => {
    const newStatus = currentStatus === 'DRAFT' ? 'PUBLISHED' : 'DRAFT'
    const action = newStatus === 'PUBLISHED' ? 'publish' : 'unpublish'

    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (data.success) {
        fetchPosts()
      } else {
        alert(`Failed to ${action}: ${data.message}`)
      }
    } catch (error) {
      alert(`Error ${action}ing post`)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/admin" className="text-2xl font-bold text-gray-900">
              Beauty<span className="text-gray-600">Finder</span>
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog Management</h1>
            <p className="text-gray-600">Create and manage blog posts</p>
          </div>
          <Link
            href="/admin/blog/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            + New Post
          </Link>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filterStatus === status
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {status} {status !== 'ALL' && `(${posts.filter(p => p.status === status).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No posts found.</p>
            <Link
              href="/admin/blog/new"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Create your first post →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start gap-4">
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Post Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{post.title}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            post.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {post.status}
                          </span>
                        </div>
                        {post.excerpt && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Author: {post.author}</span>
                          {post.publishedAt && (
                            <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                          )}
                          <span>Updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleTogglePublish(post.slug, post.status)}
                        className={`text-sm px-3 py-1 rounded font-medium ${
                          post.status === 'DRAFT'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                      >
                        {post.status === 'DRAFT' ? 'Publish' : 'Unpublish'}
                      </button>
                      {post.status === 'PUBLISHED' && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Post →
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${post.slug}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Edit →
                      </Link>
                      <button
                        onClick={() => handleDelete(post.slug, post.title)}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

