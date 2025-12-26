'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarkdownEditor from '@/components/MarkdownEditor'

// Dynamically import ReactMarkdown to reduce initial bundle size
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-100 h-32 rounded"></div>,
})

interface ProductContent {
  id: string
  productId: string
  slug: string
  hook: string | null
  whyTrending: string | null
  whatItDoes: string | null
  theGood: string | null
  theBad: string | null
  whoShouldTry: string | null
  whoShouldSkip: string | null
  alternatives: string | null
  whatRealUsersSay: string | null
  editorNotes: string | null
  redditHotness: number | null
  googleTrendsData: any | null
  faq: Array<{ question: string; answer: string }> | null
  editedByHuman: boolean
}

interface Product {
  id: string
  name: string
  brand: string | null
  category: string | null
  price: number | null
  imageUrl: string | null
  amazonUrl: string | null
  status: string
  content: ProductContent | null
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [content, setContent] = useState<ProductContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string }>>([])
  const [editedProductName, setEditedProductName] = useState<string>('')
  const [savingName, setSavingName] = useState(false)
  const [editedBrand, setEditedBrand] = useState<string>('')
  const [savingBrand, setSavingBrand] = useState(false)
  const [editedCategory, setEditedCategory] = useState<string>('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [editorNotes, setEditorNotes] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [redditHotness, setRedditHotness] = useState<number | null>(null)
  const [savingHotness, setSavingHotness] = useState(false)
  const [googleTrendsUrl, setGoogleTrendsUrl] = useState<string>('')
  const [savingTrends, setSavingTrends] = useState(false)
  const [scrapingAmazon, setScrapingAmazon] = useState(false)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  
  // Track if fields have been manually edited to prevent overwriting on refetch
  const hasEditedName = useRef(false)
  const hasEditedBrand = useRef(false)
  const hasEditedCategory = useRef(false)
  const hasEditedNotes = useRef(false)
  const hasEditedHotness = useRef(false)
  const hasEditedTrends = useRef(false)

  // Load product and content
  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()

      if (data.success && data.product) {
        setProduct(data.product)
        // Only update fields if they haven't been manually edited
        if (!hasEditedName.current) {
          setEditedProductName(data.product.name)
        }
        if (!hasEditedBrand.current) {
          setEditedBrand(data.product.brand || '')
        }
        if (!hasEditedCategory.current) {
          setEditedCategory(data.product.category || '')
        }
        if (data.product.content) {
          setContent(data.product.content)
          setFaqItems(data.product.content.faq || [])
          if (!hasEditedNotes.current) {
            setEditorNotes(data.product.content.editorNotes || '')
          }
          if (!hasEditedHotness.current) {
            setRedditHotness(data.product.content.redditHotness || null)
          }
          // Set Google Trends URL if we have data
          if (data.product.content.googleTrendsData) {
            const trendsData = data.product.content.googleTrendsData
            if (trendsData.url && !hasEditedTrends.current) {
              setGoogleTrendsUrl(trendsData.url)
            }
          }
        } else {
          // If no content exists, reset edit flags for content fields
          if (!hasEditedNotes.current) {
            setEditorNotes('')
          }
          if (!hasEditedHotness.current) {
            setRedditHotness(null)
          }
          if (!hasEditedTrends.current) {
            setGoogleTrendsUrl('')
          }
        }
      } else {
        setMessage('Product not found')
      }
    } catch (error) {
      setMessage('Error loading product')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProductName = async () => {
    if (!product || !editedProductName.trim()) {
      setMessage('Product name cannot be empty')
      return
    }

    setSavingName(true)
    try {
      // Generate slug from the new name
      const { generateSlug } = await import('@/lib/utils')
      const newSlug = generateSlug(editedProductName.trim()).substring(0, 100)

      // Update product name
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedProductName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        // Update the product state
        const updatedProduct = { ...product, name: editedProductName.trim() }
        setProduct(updatedProduct)
        
        // Update slug in content if it exists, or create content with the slug
        if (content) {
          // Update existing content slug
          const contentResponse = await fetch(`/api/products/${productId}/content`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: newSlug }),
          })
          
          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            if (contentData.success) {
              setContent({ ...content, slug: newSlug })
            }
          }
        } else {
          // Create content with the new slug
          const contentResponse = await fetch(`/api/products/${productId}/content`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: newSlug }),
          })
          
          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            if (contentData.success) {
              setContent(contentData.content)
            }
          }
        }
        
        // Keep the flag set so the name doesn't revert if fetchProduct is called later
        // The flag will only be reset when the user explicitly changes the name again
        // or when the page is reloaded
        hasEditedName.current = true // Keep it set so fetchProduct won't overwrite
        setMessage('✅ Product name and slug saved!')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed to save name: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveBrand = async () => {
    if (!product) {
      setMessage('Product not found')
      return
    }

    setSavingBrand(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: editedBrand.trim() || null }),
      })

      const data = await response.json()

      if (data.success) {
        setProduct({ ...product, brand: editedBrand.trim() || null })
        hasEditedBrand.current = false // Reset flag after successful save
        setMessage('✅ Brand saved!')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed to save brand: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingBrand(false)
    }
  }

  const handleSaveCategory = async () => {
    if (!product) {
      setMessage('Product not found')
      return
    }

    setSavingCategory(true)
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editedCategory.trim() || null }),
      })

      const data = await response.json()

      if (data.success) {
        setProduct({ ...product, category: editedCategory.trim() || null })
        hasEditedCategory.current = false // Reset flag after successful save
        setMessage('✅ Category saved!')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed to save category: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSaveEditorNotes = async () => {
    setSavingNotes(true)
    try {
      // If content doesn't exist, create it with just the editorNotes
      const method = content ? 'PATCH' : 'PUT'
      const slug = content?.slug || (product?.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 100) || 'product')
      
      const response = await fetch(`/api/products/${productId}/content`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(content ? {} : { slug }), // Only include slug if creating new content
          editorNotes: editorNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (content) {
          setContent({ ...content, editorNotes: editorNotes.trim() || null })
          hasEditedNotes.current = false // Reset flag after successful save
        } else {
          // Content was just created, refresh to get it
          await fetchProduct()
        }
      } else {
        console.error('Failed to save editor notes:', data.message)
      }
    } catch (error) {
      console.error('Error saving editor notes:', error)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSaveRedditHotness = async (level: number) => {
    setSavingHotness(true)
    setRedditHotness(level)
    try {
      // If content doesn't exist, create it with just the redditHotness
      const method = content ? 'PATCH' : 'PUT'
      const slug = content?.slug || (product?.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 100) || 'product')
      
      const response = await fetch(`/api/products/${productId}/content`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(content ? {} : { slug }), // Only include slug if creating new content
          redditHotness: level,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (content) {
          setContent({ ...content, redditHotness: level })
          hasEditedHotness.current = false // Reset flag after successful save
        } else {
          // Content was just created, refresh to get it
          await fetchProduct()
        }
      } else {
        console.error('Failed to save Reddit hotness:', data.message)
        setRedditHotness(content?.redditHotness || null)
      }
    } catch (error) {
      console.error('Error saving Reddit hotness:', error)
      setRedditHotness(content?.redditHotness || null)
    } finally {
      setSavingHotness(false)
    }
  }

  const handleSaveGoogleTrends = async () => {
    setSavingTrends(true)
    try {
      // If content doesn't exist, create it with just the googleTrendsData
      const method = content ? 'PATCH' : 'PUT'
      const slug = content?.slug || (product?.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 100) || 'product')
      
      const response = await fetch(`/api/products/${productId}/content`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(content ? {} : { slug }), // Only include slug if creating new content
          googleTrendsData: googleTrendsUrl.trim() 
            ? { url: googleTrendsUrl.trim(), updatedAt: new Date().toISOString() }
            : null 
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (content) {
          setContent({ 
            ...content, 
            googleTrendsData: googleTrendsUrl.trim() 
              ? { url: googleTrendsUrl.trim(), updatedAt: new Date().toISOString() }
              : null 
          })
          hasEditedTrends.current = false // Reset flag after successful save
        } else {
          // Content was just created, refresh to get it
          await fetchProduct()
        }
      } else {
        console.error('Failed to save Google Trends URL:', data.message)
      }
    } catch (error) {
      console.error('Error saving Google Trends URL:', error)
    } finally {
      setSavingTrends(false)
    }
  }

  const handleScrapeAmazonData = async () => {
    if (!product || !product.amazonUrl) {
      setMessage('Product does not have an Amazon URL')
      return
    }

    setScrapingAmazon(true)
    setMessage('Scraping Amazon data...')
    
    try {
      const response = await fetch(`/api/products/${productId}/scrape-amazon`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✅ ${data.message}`)
        // Refresh product data but preserve edited fields
        // Only fetch if we haven't edited the name
        if (!hasEditedName.current) {
          await fetchProduct()
        } else {
          // Just update the product state without overwriting edited name
          const refreshResponse = await fetch(`/api/products/${productId}`)
          const refreshData = await refreshResponse.json()
          if (refreshData.success) {
            setProduct(refreshData.product)
            // Don't update editedProductName since it's been edited
          }
        }
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setScrapingAmazon(false)
    }
  }

  const handleRegenerateSection = async (section: string) => {
    if (!content) return

    setRegeneratingSection(section)
    setMessage(`Regenerating ${section} with AI...`)
    
    try {
      const response = await fetch(`/api/products/${productId}/regenerate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✅ ${section} regenerated!`)
        // Update the content state with the new section
        setContent({ ...content, [section]: data.content })
        // Refresh to get latest but preserve edited fields
        if (!hasEditedName.current) {
          await fetchProduct()
        } else {
          // Just update content without overwriting edited name
          const refreshResponse = await fetch(`/api/products/${productId}`)
          const refreshData = await refreshResponse.json()
          if (refreshData.success && refreshData.product.content) {
            setContent(refreshData.product.content)
            setProduct(refreshData.product)
            // Don't update editedProductName since it's been edited
          }
        }
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRegeneratingSection(null)
    }
  }

  const handleGenerateContent = async () => {
    // Disable button immediately to prevent double clicks
    if (generating) return
    setGenerating(true)
    
    try {
      // Save product name first if it was edited
      if (product && editedProductName.trim() !== product.name) {
        setMessage('Saving product name...')
        await handleSaveProductName()
        // Wait a moment for the save to complete
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Save editor notes if they were changed (before generating, so Claude can use them)
      if (editorNotes.trim() && (!content || content.editorNotes !== editorNotes.trim())) {
        setMessage('Saving editor notes...')
        try {
          await handleSaveEditorNotes()
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error('Error saving editor notes:', error)
          // Continue anyway
        }
      }

      // Save Reddit trending level if it was changed
      if (redditHotness !== null && (!content || content.redditHotness !== redditHotness)) {
        setMessage('Saving Reddit trending level...')
        try {
          await handleSaveRedditHotness(redditHotness)
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error('Error saving Reddit hotness:', error)
          // Continue anyway
        }
      }

      // Save Google Trends URL if it was changed
      if (googleTrendsUrl.trim() && (!content || (content.googleTrendsData as any)?.url !== googleTrendsUrl.trim())) {
        setMessage('Saving Google Trends URL...')
        try {
          await handleSaveGoogleTrends()
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error('Error saving Google Trends:', error)
          // Continue anyway
        }
      }

      setMessage('Searching Reddit for quotes...')
      
      // Small delay to show the message
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setMessage('Generating content with Claude AI (this may take 30-60 seconds)...')

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Content generated! Refreshing...')
        // Wait longer for database to be fully updated and retry fetching
        let retries = 3
        let contentLoaded = false
        
        while (retries > 0 && !contentLoaded) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between retries
          
          await fetchProduct()
          
          // Check if content was actually loaded
          const response = await fetch(`/api/products/${productId}`)
          const checkData = await response.json()
          
          if (checkData.success && checkData.product?.content) {
            // Check if content has actual fields (not just empty content)
            const hasContent = checkData.product.content.hook || 
                              checkData.product.content.whyTrending ||
                              checkData.product.content.whatItDoes
            if (hasContent) {
              contentLoaded = true
              setContent(checkData.product.content)
              setFaqItems(checkData.product.content.faq || [])
              setEditorNotes(checkData.product.content.editorNotes || '')
            }
          }
          
          retries--
        }
        
        if (contentLoaded) {
          setMessage('✅ Content generated! You can now view the page or publish it.')
          // Force a router refresh to ensure all data is up to date
          router.refresh()
        } else {
          setMessage('✅ Content generated! If content doesn\'t appear, please refresh the page.')
          // Still refresh the router in case it helps
          router.refresh()
        }
      } else {
        setMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!content) return

    setSaving(true)
    setMessage('Saving...')

    try {
      const response = await fetch(`/api/products/${productId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...content,
          faq: faqItems,
          editedByHuman: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Saved successfully!')
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

  const handlePublish = async () => {
    if (!content) return

    setSaving(true)
    setMessage('Publishing...')

    try {
      // First save content
      await fetch(`/api/products/${productId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...content,
          faq: faqItems,
          editedByHuman: true,
        }),
      })

      // Then publish
      const response = await fetch(`/api/products/${productId}/publish`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Published successfully!')
        setTimeout(() => {
          router.push(`/products/${content.slug}`)
        }, 1500)
      } else {
        setMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateContent = (field: keyof ProductContent, value: string) => {
    if (!content) return
    setContent({ ...content, [field]: value })
  }

  const addFaqItem = () => {
    setFaqItems([...faqItems, { question: '', answer: '' }])
  }

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqItems]
    updated[index] = { ...updated[index], [field]: value }
    setFaqItems(updated)
  }

  const removeFaqItem = (index: number) => {
    setFaqItems(faqItems.filter((_, i) => i !== index))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        // Insert image markdown at cursor position (or append)
        const imageMarkdown = `![${file.name}](${data.url})`
        setMessage(`✅ Image uploaded! Add this to your content: ${imageMarkdown}`)
      } else {
        setMessage(`❌ Upload failed: ${data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Product not found</p>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Admin
          </Link>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Product Before Generating Content</h2>
            
            {/* Product Name Editor */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name / Title
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Clean up Amazon's keyword-stuffed titles before generating content
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedProductName}
                  onChange={(e) => {
                    hasEditedName.current = true
                    setEditedProductName(e.target.value)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter clean product name..."
                />
                {editedProductName !== product.name && (
                  <button
                    onClick={handleSaveProductName}
                    disabled={savingName || !editedProductName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:bg-gray-400"
                  >
                    {savingName ? 'Saving...' : 'Save Name'}
                  </button>
                )}
              </div>
              {product.name !== editedProductName && (
                <p className="text-xs text-gray-500 mt-2">
                  Original: <span className="line-through">{product.name}</span>
                </p>
              )}
            </div>

            {/* Brand Editor */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Brand
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Edit the product brand name
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedBrand}
                  onChange={(e) => {
                    hasEditedBrand.current = true
                    setEditedBrand(e.target.value)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter brand name..."
                />
                {editedBrand !== (product.brand || '') && (
                  <button
                    onClick={handleSaveBrand}
                    disabled={savingBrand}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:bg-gray-400"
                  >
                    {savingBrand ? 'Saving...' : 'Save Brand'}
                  </button>
                )}
              </div>
              {product.brand && editedBrand !== product.brand && (
                <p className="text-xs text-gray-500 mt-2">
                  Original: <span className="line-through">{product.brand}</span>
                </p>
              )}
            </div>

            {/* Editor Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Editor Notes (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add context, trends, or insights about this product. Claude will use these notes to inform content generation but won't copy them directly. Examples: "Went viral on TikTok in January", "Known for causing breakouts in sensitive skin", "Popular with oily skin users".
              </p>
              <textarea
                value={editorNotes}
                onChange={(e) => {
                  hasEditedNotes.current = true
                  setEditorNotes(e.target.value)
                }}
                onBlur={handleSaveEditorNotes}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px]"
                placeholder="Add notes about why this is trending, who it's for, common complaints, etc..."
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Notes are saved automatically when you click outside the textarea
                </p>
                {savingNotes && (
                  <span className="text-xs text-gray-500">Saving...</span>
                )}
              </div>
            </div>

            {/* Reddit Hotness Rating */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reddit Trending Level
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Manually set how hot/trending this product is on Reddit
              </p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((level) => {
                  const labels = ['Low', 'Growing', 'Strong', 'Trending', 'Breakout']
                  const colors = [
                    { bg: 'bg-gray-100', hover: 'hover:bg-gray-200', border: 'border-gray-400', text: 'text-gray-800', selected: 'ring-gray-400' },
                    { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', border: 'border-blue-400', text: 'text-blue-800', selected: 'ring-blue-400' },
                    { bg: 'bg-green-100', hover: 'hover:bg-green-200', border: 'border-green-400', text: 'text-green-800', selected: 'ring-green-400' },
                    { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', border: 'border-orange-400', text: 'text-orange-800', selected: 'ring-orange-400' },
                    { bg: 'bg-red-100', hover: 'hover:bg-red-200', border: 'border-red-400', text: 'text-red-800', selected: 'ring-red-400' },
                  ]
                  const color = colors[level - 1]
                  const isSelected = redditHotness === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        hasEditedHotness.current = true
                        handleSaveRedditHotness(level)
                      }}
                      disabled={savingHotness}
                      className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                        isSelected
                          ? `${color.bg} ${color.border} ${color.text} ring-2 ${color.selected} ring-offset-1`
                          : `${color.bg} ${color.hover} ${color.border} ${color.text}`
                      } ${savingHotness ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {level}: {labels[level - 1]}
                    </button>
                  )
                })}
              </div>
              {savingHotness && (
                <p className="text-xs text-gray-500 mt-2">Saving...</p>
              )}
            </div>

            {/* Google Trends URL */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google Trends URL
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Paste the Google Trends URL for this product (worldwide view, e.g., https://trends.google.com/trends/explore?q=Product+Name&hl=en-GB)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleTrendsUrl}
                  onChange={(e) => {
                    hasEditedTrends.current = true
                    setGoogleTrendsUrl(e.target.value)
                  }}
                  onBlur={handleSaveGoogleTrends}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://trends.google.com/trends/explore?q=Product+Name&hl=en-GB"
                />
                {savingTrends && (
                  <span className="text-xs text-gray-500 self-center">Saving...</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                URL is saved automatically when you click outside the field
              </p>
            </div>

            {/* Update Stats Section */}
            {product.amazonUrl && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Product Stats</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Refresh Amazon data (reviews, ratings, price, image) without regenerating content
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleScrapeAmazonData()
                  }}
                  disabled={scrapingAmazon}
                  className="w-full px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {scrapingAmazon ? 'Scraping Amazon Data...' : '📥 Refresh Amazon Data (Reviews, Ratings, Price)'}
                </button>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 mt-6">
              <p className="text-gray-600 mb-6 text-center">Ready to generate content?</p>
              <div className="text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleGenerateContent()
                  }}
                  disabled={generating || savingName || scrapingAmazon}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                  {generating ? 'Generating...' : '✨ Generate Detail Page with Claude AI'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                ← Admin
              </Link>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedProductName}
                  onChange={(e) => {
                    hasEditedName.current = true
                    setEditedProductName(e.target.value)
                  }}
                  className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1"
                  onBlur={handleSaveProductName}
                />
                {editedProductName !== product.name && (
                  <span className="text-xs text-gray-500">(edited)</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {content.slug && (
                <Link
                  href={`/products/${content.slug}`}
                  target="_blank"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Page →
                </Link>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:bg-gray-400"
              >
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Stats & Metadata Sidebar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Stats & Metadata</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select
                value={editedCategory}
                onChange={(e) => {
                  hasEditedCategory.current = true
                  setEditedCategory(e.target.value)
                }}
                onBlur={handleSaveCategory}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="">No category</option>
                <option value="Skincare">Skincare</option>
                <option value="Makeup">Makeup</option>
                <option value="Hair Care">Hair Care</option>
                <option value="Body Care">Body Care</option>
                <option value="Fragrance">Fragrance</option>
                <option value="Tools & Accessories">Tools & Accessories</option>
                <option value="Men's Grooming">Men's Grooming</option>
                <option value="Other">Other</option>
              </select>
              {savingCategory && (
                <p className="text-xs text-gray-500 mt-1">Saving...</p>
              )}
            </div>
            {/* Reddit Hotness */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reddit Trending Level
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((level) => {
                  const labels = ['Low', 'Growing', 'Strong', 'Trending', 'Breakout']
                  const colors = [
                    { bg: 'bg-gray-100', hover: 'hover:bg-gray-200', border: 'border-gray-400', text: 'text-gray-800', selected: 'ring-gray-400' },
                    { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', border: 'border-blue-400', text: 'text-blue-800', selected: 'ring-blue-400' },
                    { bg: 'bg-green-100', hover: 'hover:bg-green-200', border: 'border-green-400', text: 'text-green-800', selected: 'ring-green-400' },
                    { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', border: 'border-orange-400', text: 'text-orange-800', selected: 'ring-orange-400' },
                    { bg: 'bg-red-100', hover: 'hover:bg-red-200', border: 'border-red-400', text: 'text-red-800', selected: 'ring-red-400' },
                  ]
                  const color = colors[level - 1]
                  const isSelected = redditHotness === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        hasEditedHotness.current = true
                        handleSaveRedditHotness(level)
                      }}
                      disabled={savingHotness}
                      className={`px-3 py-1.5 rounded-lg border-2 font-medium text-xs transition-colors ${
                        isSelected
                          ? `${color.bg} ${color.border} ${color.text} ring-2 ${color.selected} ring-offset-1`
                          : `${color.bg} ${color.hover} ${color.border} ${color.text}`
                      } ${savingHotness ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={labels[level - 1]}
                    >
                      {level}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Google Trends URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google Trends URL
              </label>
              <input
                type="text"
                value={googleTrendsUrl}
                onChange={(e) => {
                  hasEditedTrends.current = true
                  setGoogleTrendsUrl(e.target.value)
                }}
                onBlur={handleSaveGoogleTrends}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="https://trends.google.com/trends/explore?q=..."
              />
              {savingTrends && (
                <p className="text-xs text-gray-500 mt-1">Saving...</p>
              )}
            </div>

            {/* Refresh Amazon Data */}
            {product.amazonUrl && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amazon Data
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleScrapeAmazonData()
                  }}
                  disabled={scrapingAmazon}
                  className="w-full px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium rounded-lg disabled:bg-gray-300 disabled:text-gray-500 text-sm"
                >
                  {scrapingAmazon ? 'Scraping...' : '📥 Refresh Reviews & Ratings'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image Upload */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Upload Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="text-sm text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-2">
            Upload images to include in your markdown content. Use the markdown syntax shown after upload.
          </p>
        </div>

        {/* Regenerate All Button */}
        {content && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Regenerate All Content</h3>
                <p className="text-xs text-gray-500">Regenerate all sections at once with fresh AI content</p>
              </div>
              <button
                onClick={handleGenerateContent}
                disabled={generating || saving}
                className="px-4 py-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] text-white rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {generating ? 'Regenerating...' : '🔄 Regenerate All'}
              </button>
            </div>
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-6">
          <div>
            <MarkdownEditor
              label="Hook (Homepage Card)"
              value={content.hook || ''}
              onChange={(value) => updateContent('hook', value)}
              placeholder="2-sentence hook for homepage card..."
              onRegenerate={() => handleRegenerateSection('hook')}
              isRegenerating={regeneratingSection === 'hook'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="Why It's Trending Right Now"
              value={content.whyTrending || ''}
              onChange={(value) => updateContent('whyTrending', value)}
              placeholder="Explain why this product is trending..."
              onRegenerate={() => handleRegenerateSection('whyTrending')}
              isRegenerating={regeneratingSection === 'whyTrending'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="What It Actually Does"
              value={content.whatItDoes || ''}
              onChange={(value) => updateContent('whatItDoes', value)}
              placeholder="Plain language explanation..."
              onRegenerate={() => handleRegenerateSection('whatItDoes')}
              isRegenerating={regeneratingSection === 'whatItDoes'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="The Good"
              value={content.theGood || ''}
              onChange={(value) => updateContent('theGood', value)}
              placeholder="What people are loving..."
              onRegenerate={() => handleRegenerateSection('theGood')}
              isRegenerating={regeneratingSection === 'theGood'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="The Bad"
              value={content.theBad || ''}
              onChange={(value) => updateContent('theBad', value)}
              placeholder="Honest critiques..."
              onRegenerate={() => handleRegenerateSection('theBad')}
              isRegenerating={regeneratingSection === 'theBad'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="Who Should Try It"
              value={content.whoShouldTry || ''}
              onChange={(value) => updateContent('whoShouldTry', value)}
              placeholder="Clear use cases..."
              onRegenerate={() => handleRegenerateSection('whoShouldTry')}
              isRegenerating={regeneratingSection === 'whoShouldTry'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="Who Should Skip It"
              value={content.whoShouldSkip || ''}
              onChange={(value) => updateContent('whoShouldSkip', value)}
              placeholder="Clear non-use cases..."
              onRegenerate={() => handleRegenerateSection('whoShouldSkip')}
              isRegenerating={regeneratingSection === 'whoShouldSkip'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="Alternatives"
              value={content.alternatives || ''}
              onChange={(value) => updateContent('alternatives', value)}
              placeholder="Budget, luxury, and different approach options..."
              onRegenerate={() => handleRegenerateSection('alternatives')}
              isRegenerating={regeneratingSection === 'alternatives'}
            />
          </div>

          <div>
            <MarkdownEditor
              label="What Real Users Are Saying"
              value={content.whatRealUsersSay || ''}
              onChange={(value) => updateContent('whatRealUsersSay', value)}
              placeholder="Specific user experiences and quotes..."
              onRegenerate={() => handleRegenerateSection('whatRealUsersSay')}
              isRegenerating={regeneratingSection === 'whatRealUsersSay'}
            />
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700">FAQ</label>
              <button
                type="button"
                onClick={addFaqItem}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                + Add FAQ Item
              </button>
            </div>
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-500">FAQ #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFaqItem(index)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                    placeholder="Question"
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                    placeholder="Answer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
              ))}
              {faqItems.length === 0 && (
                <p className="text-sm text-gray-500 italic">No FAQ items yet. Click "Add FAQ Item" to add one.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

