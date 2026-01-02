'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import MarkdownEditor from '@/components/MarkdownEditor'

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-100 h-32 rounded"></div>,
})

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  featuredImage: string | null
  author: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

interface BlogPostVersion {
  id: string
  content: string
  title: string | null
  excerpt: string | null
  createdAt: string
  createdBy: string | null
}

export default function EditBlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const slug = params.slug as string

  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [author, setAuthor] = useState('BeautyFinder Team')
  const [postStatus, setPostStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [generatingPost, setGeneratingPost] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  const [wordCount, setWordCount] = useState('1000')
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<BlogPostVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchPost()
    }
  }, [sessionStatus, slug])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/blog/${slug}`)
      const data = await response.json()
      if (data.success && data.post) {
        setPost(data.post)
        setTitle(data.post.title)
        setContent(data.post.content || '')
        setExcerpt(data.post.excerpt || '')
        setFeaturedImage(data.post.featuredImage || '')
        setAuthor(data.post.author || 'BeautyFinder Team')
        setPostStatus(data.post.status)
      } else {
        setMessage('Post not found')
      }
    } catch (error) {
      setMessage('Error loading post')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setMessage('Title is required')
      return
    }

    setSaving(true)
    setMessage('Saving...')

    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          excerpt: excerpt || null,
          featuredImage: featuredImage || null,
          author,
          status: postStatus,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Saved successfully!')
        // Refresh the post data
        fetchPost()
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success && data.url) {
        setFeaturedImage(data.url)
        setMessage('✅ Image uploaded successfully!')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed to upload image: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleGeneratePost = async () => {
    if (!topicInput.trim()) {
      setMessage('Please enter a topic')
      return
    }

    // Warn if there's existing content
    if (content.trim() && !confirm('This will overwrite the current content. A version will be saved. Continue?')) {
      return
    }

    setGeneratingPost(true)
    setMessage('Generating blog post with AI...')

    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput.trim(),
          wordCount: parseInt(wordCount) || 1000,
          blogPostId: post?.id, // Pass ID to save version
        }),
      })

      const data = await response.json()

      if (data.success && data.content) {
        setContent(data.content)
        // Auto-generate title from topic if title is empty
        if (!title.trim()) {
          setTitle(topicInput.trim())
        }
        setMessage('✅ Blog post generated successfully! Previous version saved.')
        setTimeout(() => setMessage(null), 3000)
        // Refresh versions if showing
        if (showVersions) {
          fetchVersions()
        }
      } else {
        setMessage(`❌ Failed to generate: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingPost(false)
    }
  }

  const fetchVersions = async () => {
    setLoadingVersions(true)
    try {
      const response = await fetch(`/api/blog/${slug}/versions`)
      const data = await response.json()
      if (data.success) {
        setVersions(data.versions || [])
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleShowVersions = () => {
    if (!showVersions) {
      fetchVersions()
    }
    setShowVersions(!showVersions)
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Restore this version? This will overwrite the current content.')) {
      return
    }

    try {
      const response = await fetch(`/api/blog/${slug}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })

      const data = await response.json()
      if (data.success) {
        // Reload the post to get updated content
        await fetchPost()
        setMessage('✅ Version restored successfully!')
        setTimeout(() => setMessage(null), 3000)
        setShowVersions(false)
      } else {
        setMessage(`❌ Failed to restore: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (sessionStatus === 'unauthenticated' || !session) {
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
            <Link href="/admin/blog" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Blog Post
            </h1>
            {message && (
              <div className={`px-4 py-2 rounded ${
                message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter blog post title"
            />
          </div>

          {/* Author */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="BeautyFinder Team"
            />
          </div>

          {/* Featured Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Image URL or upload below"
              />
              <div className="flex items-center gap-4">
                <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm font-medium">
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                {featuredImage && (
                  <div className="relative w-24 h-24 border border-gray-200 rounded overflow-hidden">
                    <img
                      src={featuredImage}
                      alt="Featured"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Short excerpt for blog listing (optional)"
            />
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={postStatus}
              onChange={(e) => setPostStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {/* AI Generation */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Generate with AI
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Enter topic (e.g., 'Best Korean skincare trends 2025')"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleGeneratePost()
                    }
                  }}
                />
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                  placeholder="Words"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="500"
                  max="3000"
                />
                <button
                  onClick={handleGeneratePost}
                  disabled={generatingPost || !topicInput.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPost ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                AI will query your product database and create a blog post with relevant product links. 
                Products in your database will link to BeautyFinder pages; others will use Amazon affiliate links.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (Markdown) *
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog post content in Markdown..."
              />
            </div>
          </div>

          {/* Version History */}
          {post && (
            <div className="mb-6">
              <button
                onClick={handleShowVersions}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showVersions ? 'Hide' : 'Show'} Version History ({versions.length})
              </button>
              
              {showVersions && (
                <div className="mt-3 border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  {loadingVersions ? (
                    <div className="text-sm text-gray-500">Loading versions...</div>
                  ) : versions.length === 0 ? (
                    <div className="text-sm text-gray-500">No previous versions saved.</div>
                  ) : (
                    <div className="space-y-3">
                      {versions.map((version) => (
                        <div key={version.id} className="border-b border-gray-200 pb-3 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(version.createdAt).toLocaleString()}
                              </div>
                              {version.createdBy && (
                                <div className="text-xs text-gray-500">by {version.createdBy}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRestoreVersion(version.id)}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                            >
                              Restore
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {version.content.substring(0, 200)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {content && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 prose max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
            <Link
              href="/admin/blog"
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

