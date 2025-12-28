'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAmazonImageUrl } from '@/lib/amazon-image'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'

type CollectionStatus = 'idle' | 'running' | 'success' | 'error'

interface TrendSignal {
  id: string
  source: string
  value: number | null
  metadata: any
  detectedAt?: string | Date
}

interface Product {
  id: string
  name: string
  brand: string | null
  price: number | null
  trendScore: number
  currentScore: number | null
  baseScore: number | null
  status: 'FLAGGED' | 'DRAFT' | 'PUBLISHED'
  imageUrl: string | null
  amazonUrl: string | null
  content: { slug: string } | null
  trendSignals?: TrendSignal[]
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Auth check - MUST be before any conditional returns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth')
      if (auth === 'true') {
        setIsAuthenticated(true)
      }
      setIsLoading(false)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'BeautyFinder2025!Admin') {
      sessionStorage.setItem('admin_auth', 'true')
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password')
    }
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Access</h1>
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Access Admin
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Render the full dashboard
  return <AdminDashboard />
}

// Separate component for the dashboard to avoid hook ordering issues
function AdminDashboard() {
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('idle')
  const [enrichStatus, setEnrichStatus] = useState<CollectionStatus>('idle')
  const [generateStatus, setGenerateStatus] = useState<CollectionStatus>('idle')
  const [messages, setMessages] = useState<string[]>([])
  
  // Product management state
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'FLAGGED' | 'DRAFT' | 'PUBLISHED' | 'ALL'>('ALL')
  const [filterSource, setFilterSource] = useState<'COMBINED' | 'AMAZON_ONLY' | 'REDDIT_ONLY' | 'ALL'>('ALL')
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [selectedRedditPosts, setSelectedRedditPosts] = useState<Set<string>>(new Set())
  const [isOnMoversShakers, setIsOnMoversShakers] = useState(true) // Default to true for M&S products
  const [scrapeStatus, setScrapeStatus] = useState<CollectionStatus>('idle')
  const [migrateStatus, setMigrateStatus] = useState<CollectionStatus>('idle')
  const [syncStatus, setSyncStatus] = useState<CollectionStatus>('idle')
  const [dailyUpdateStatus, setDailyUpdateStatus] = useState<CollectionStatus>('idle')
  const [backfillStatus, setBackfillStatus] = useState<CollectionStatus>('idle')
  const [recalculateScoresStatus, setRecalculateScoresStatus] = useState<CollectionStatus>('idle')
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ productId: string; productName: string } | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  
  // Merge/duplicate state
  const [mergeModal, setMergeModal] = useState<{ duplicateId: string; duplicateName: string } | null>(null)
  const [mergeSearchTerm, setMergeSearchTerm] = useState('')
  const [mergeSearchResults, setMergeSearchResults] = useState<Product[]>([])
  const [mergingProductId, setMergingProductId] = useState<string | null>(null)
  const [selectedTargetProduct, setSelectedTargetProduct] = useState<string | null>(null)

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runFullCollection = async () => {
    setCollectionStatus('running')
    addMessage('Starting collection: Amazon → Weekly Reddit Scan → Matching...')

    try {
      // New approach: Amazon first, then weekly Reddit scan, then matching
      const collectResponse = await fetch('/api/collect-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'all' }),
      })

      const collectData = await collectResponse.json()

      if (!collectData.success) {
        setCollectionStatus('error')
        addMessage(`❌ Collection failed: ${collectData.message}`)
        setTimeout(() => setCollectionStatus('idle'), 3000)
        return
      }

      addMessage(`✅ ${collectData.message}`)

      setCollectionStatus('success')
      addMessage('🎉 Full collection complete!')
      handleCollectionComplete('all')
    } catch (error) {
      setCollectionStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setCollectionStatus('idle'), 3000)
  }

  const runRedditEnrichment = async () => {
    setEnrichStatus('running')
    addMessage('Running weekly Reddit scan (extracting product names from high-engagement posts)...')

    try {
      const enrichResponse = await fetch('/api/collect-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'reddit' }),
      })

      const enrichData = await enrichResponse.json()
      
      if (enrichData.success) {
        setEnrichStatus('success')
        addMessage(`✅ ${enrichData.message}`)
        handleCollectionComplete('reddit')
      } else {
        setEnrichStatus('error')
        addMessage(`❌ ${enrichData.message}`)
      }
    } catch (error) {
      setEnrichStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setEnrichStatus('idle'), 3000)
  }

  // Fetch products
  const fetchProducts = async (status?: string, source?: string) => {
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== 'ALL') params.set('status', status)
      if (source && source !== 'ALL') params.set('source', source)
      params.set('limit', '100')
      
      const url = `/api/products?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      addMessage(`❌ Failed to load products`)
    } finally {
      setLoadingProducts(false)
    }
  }

  // Load products on mount and when filters change
  useEffect(() => {
    const status = filterStatus === 'ALL' ? undefined : filterStatus
    const source = filterSource === 'ALL' ? undefined : filterSource
    fetchProducts(status, source)
  }, [filterStatus, filterSource])

  // Refresh products after collection
  const handleCollectionComplete = (source: string) => {
    if (filterStatus === 'FLAGGED' || filterStatus === 'ALL') {
      // Refresh products if viewing flagged/all
      setTimeout(() => {
        fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        // Also trigger score recalculation
        fetch('/api/fix-scores', { method: 'POST' }).catch(() => {})
      }, 2000)
    }
  }

  const handleGenerateContent = async (productId: string) => {
    setGeneratingProductId(productId)
    addMessage(`Generating content for product...`)

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      const data = await response.json()

      if (data.success) {
        addMessage(`✅ Content generated successfully!`)
        // Refresh products to show new content
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 1000)
      } else {
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingProductId(null)
    }
  }

  const handleGenerateAll = async () => {
    setGenerateStatus('running')
    addMessage('Generating content for all FLAGGED products...')

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAll: true }),
      })

      const data = await response.json()

      if (data.success) {
        setGenerateStatus('success')
        addMessage(`✅ Generated content for ${data.generated} products`)
        // Refresh products
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 2000)
      } else {
        setGenerateStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setGenerateStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setGenerateStatus('idle'), 3000)
  }

  const handleScrapeAmazonData = async () => {
    setScrapeStatus('running')
    addMessage('Scraping Amazon product data (reviews, Q&A, metadata)...')

    try {
      const response = await fetch('/api/scrape-amazon-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setScrapeStatus('success')
        addMessage(`✅ ${data.message}`)
        // Refresh products
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 2000)
      } else {
        setScrapeStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setScrapeStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setScrapeStatus('idle'), 3000)
  }

  const handleMigrateDatabase = async () => {
    setMigrateStatus('running')
    addMessage('Running database migration...')

    try {
      const response = await fetch('/api/migrate-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setMigrateStatus('success')
        addMessage(`✅ ${data.message}`)
        if (data.warning) {
          addMessage(`⚠️ ${data.warning}`)
        }
      } else {
        setMigrateStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
        if (data.error) {
          addMessage(`Error details: ${data.error}`)
        }
      }
    } catch (error) {
      setMigrateStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setMigrateStatus('idle'), 3000)
  }

  const handleSyncSchema = async () => {
    setSyncStatus('running')
    addMessage('Syncing database schema (db push)...')

    try {
      const response = await fetch('/api/sync-db-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setSyncStatus('success')
        addMessage(`✅ ${data.message}`)
      } else {
        setSyncStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
        if (data.error) {
          addMessage(`Error details: ${data.error}`)
        }
      }
    } catch (error) {
      setSyncStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setSyncStatus('idle'), 3000)
  }

  const handleDailyUpdate = async () => {
    setDailyUpdateStatus('running')
    addMessage('Running daily update: Recalculating age decay scores...')

    try {
      const response = await fetch('/api/daily-update', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setDailyUpdateStatus('success')
        addMessage(`✅ ${data.message}`)
        // Refresh products
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 2000)
      } else {
        setDailyUpdateStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setDailyUpdateStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setDailyUpdateStatus('idle'), 3000)
  }

  const handleRecalculateAllScores = async () => {
    setRecalculateScoresStatus('running')
    addMessage('Recalculating all product scores with new scoring logic...')

    try {
      const response = await fetch('/api/fix-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setRecalculateScoresStatus('success')
        addMessage(`✅ ${data.message}`)
        // Refresh products
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 2000)
      } else {
        setRecalculateScoresStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setRecalculateScoresStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setRecalculateScoresStatus('idle'), 3000)
  }

  const handleBackfillAgeDecay = async () => {
    setBackfillStatus('running')
    addMessage('Backfilling age decay data for existing products...')

    try {
      const response = await fetch('/api/backfill-age-decay', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setBackfillStatus('success')
        addMessage(`✅ ${data.message}`)
        // Refresh products
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 2000)
      } else {
        setBackfillStatus('error')
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      setBackfillStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setTimeout(() => setBackfillStatus('idle'), 3000)
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      addMessage('Please enter a search term')
      return
    }

    setSearchStatus('searching')
    addMessage(`Searching for "${searchTerm}"...`)

    try {
      const response = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: searchTerm }),
      })

      const data = await response.json()

      if (data.success) {
        setSearchResults(data)
        setSearchStatus('success')
        setSelectedRedditPosts(new Set()) // Reset selection
        addMessage(`✅ Found ${data.amazon ? 'Amazon product' : 'no Amazon product'} and ${data.reddit.length} Reddit posts`)
        
        if (data.existingProduct) {
          addMessage(`⚠️ Product already exists: ${data.existingProduct.name} (${data.existingProduct.status})`)
        }
      } else {
        setSearchStatus('error')
        addMessage(`❌ Search failed: ${data.message}`)
      }
    } catch (error) {
      setSearchStatus('error')
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleApproveResult = async () => {
    if (!searchResults) return

    addMessage(`Adding product to database${isOnMoversShakers ? ' (Movers & Shakers - 100 pts)' : ' (Standard Amazon - 50 pts)'}...`)

    try {
      const response = await fetch('/api/approve-search-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amazonData: searchResults.amazon,
          redditPosts: searchResults.reddit 
            ? searchResults.reddit.filter((post: any) => selectedRedditPosts.has(post.id))
            : [],
          searchTerm: searchResults.searchTerm,
          isOnMoversShakers: isOnMoversShakers, // Pass the M&S flag
        }),
      })

      const data = await response.json()

      if (data.success) {
        addMessage(`✅ ${data.updated ? 'Product updated' : 'Product added'} successfully!`)
        setSearchResults(null)
        setSearchTerm('')
        setSearchStatus('idle')
        
        // Refresh products list
        setTimeout(() => {
          fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)
        }, 1000)
      } else {
        addMessage(`❌ Failed: ${data.message}`)
      }
    } catch (error) {
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleRedditPost = (postId: string) => {
    const newSet = new Set(selectedRedditPosts)
    if (newSet.has(postId)) {
      newSet.delete(postId)
    } else {
      newSet.add(postId)
    }
    setSelectedRedditPosts(newSet)
  }

  const handleDeleteClick = (productId: string, productName: string) => {
    setDeleteConfirm({ productId, productName })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    setDeletingProductId(deleteConfirm.productId)
    addMessage(`Deleting product: ${deleteConfirm.productName}...`)

    try {
      const response = await fetch(`/api/products/${deleteConfirm.productId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        addMessage(`✅ Product "${deleteConfirm.productName}" deleted successfully`)
        setDeleteConfirm(null)
        
        // Remove product from list
        setProducts(prev => prev.filter(p => p.id !== deleteConfirm.productId))
      } else {
        addMessage(`❌ Failed to delete: ${data.message}`)
      }
    } catch (error) {
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const handleMergeClick = (productId: string, productName: string) => {
    setMergeModal({ duplicateId: productId, duplicateName: productName })
    setMergeSearchTerm('')
    setMergeSearchResults([])
    setSelectedTargetProduct(null)
  }

  const handleMergeCancel = () => {
    setMergeModal(null)
    setMergeSearchTerm('')
    setMergeSearchResults([])
    setSelectedTargetProduct(null)
    setMergingProductId(null)
  }

  const handleMergeSearch = async () => {
    if (!mergeSearchTerm.trim()) {
      setMergeSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/products?status=ALL&limit=20&search=${encodeURIComponent(mergeSearchTerm)}`)
      
      if (!response.ok) {
        const text = await response.text()
        console.error('Search failed:', text)
        addMessage('❌ Error searching for products')
        return
      }

      const data = await response.json()
      
      if (!data.success) {
        addMessage(`❌ ${data.message || 'Search failed'}`)
        return
      }
      
      // Filter out the duplicate product itself
      const filtered = (data.products || []).filter((p: Product) => p.id !== mergeModal?.duplicateId)
      setMergeSearchResults(filtered)
    } catch (error) {
      console.error('Error searching for products:', error)
      addMessage('❌ Error searching for products')
    }
  }

  const handleMergeConfirm = async () => {
    if (!mergeModal || !selectedTargetProduct) {
      addMessage('❌ Please select a target product to merge with')
      return
    }

    setMergingProductId(mergeModal.duplicateId)
    addMessage(`Merging "${mergeModal.duplicateName}" into target product...`)

    try {
      const response = await fetch(`/api/products/${mergeModal.duplicateId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProductId: selectedTargetProduct }),
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Merge failed:', text)
        addMessage(`❌ Merge failed: ${text.substring(0, 100)}`)
        setMergingProductId(null)
        return
      }

      const data = await response.json()

      if (!data.success) {
        addMessage(`❌ Merge failed: ${data.message}`)
        setMergingProductId(null)
        return
      }

      addMessage(`✅ ${data.message}`)
      handleMergeCancel()
      fetchProducts() // Refresh product list
    } catch (error) {
      console.error('Merge error:', error)
      addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMergingProductId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Beauty<span className="text-gray-600">Finder</span>
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to Site
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_auth')
                window.location.reload()
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage data collection and review generation</p>
        </div>

        {/* Product Search Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Product Search</h2>
          <p className="text-sm text-gray-600 mb-4">
            Search for a product by name or paste an Amazon URL. The system will search Amazon and Reddit, then you can approve to add it to FLAGGED products.
          </p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter product name, ASIN (e.g., B091NJQ29P), or Amazon URL"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={searchStatus === 'searching'}
            />
            <button
              onClick={handleSearch}
              disabled={searchStatus === 'searching' || !searchTerm.trim()}
              className={`px-6 py-2 rounded-lg font-semibold text-white ${
                searchStatus === 'searching'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {searchStatus === 'searching' ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="mt-6 space-y-6">
              {/* Amazon Result */}
              {searchResults.amazon && (
                <div className="border border-gray-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Amazon Product</h3>
                    {searchResults.existingProduct && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Already exists ({searchResults.existingProduct.status})
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {searchResults.amazon.imageUrl && (
                      <img
                        src={searchResults.amazon.imageUrl}
                        alt={searchResults.amazon.name}
                        className="w-full h-48 object-contain bg-white rounded border"
                      />
                    )}
                    <div className="md:col-span-2">
                      <h4 className="font-semibold text-gray-900 mb-2">{searchResults.amazon.name}</h4>
                      {searchResults.amazon.brand && (
                        <p className="text-sm text-gray-600 mb-2">Brand: {searchResults.amazon.brand}</p>
                      )}
                      {searchResults.amazon.price && (
                        <p className="text-lg font-bold text-gray-900 mb-2">${searchResults.amazon.price.toFixed(2)}</p>
                      )}
                      {searchResults.amazon.rating && (
                        <p className="text-sm text-gray-600 mb-2">
                          ⭐ {searchResults.amazon.rating}/5
                          {searchResults.amazon.reviewCount && ` (${searchResults.amazon.reviewCount.toLocaleString()} reviews)`}
                        </p>
                      )}
                      {searchResults.amazon.amazonUrl && (
                        <a
                          href={addAmazonAffiliateTag(searchResults.amazon.amazonUrl) || searchResults.amazon.amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orange-600 hover:text-orange-800 underline"
                        >
                          View on Amazon →
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Movers & Shakers Toggle */}
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={isOnMoversShakers}
                        onChange={(e) => setIsOnMoversShakers(e.target.checked)}
                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Currently on Movers & Shakers</div>
                        <div className="text-xs text-gray-600">
                          {isOnMoversShakers 
                            ? '✅ Will get 100 base score and appear in "Trending Now"' 
                            : '⚠️ Will get 50 base score (standard Amazon product)'}
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {/* Add Amazon Product Button */}
                  <div className="mt-4">
                    <button
                      onClick={handleApproveResult}
                      className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      ➕ Add This Product to List
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Adds product to FLAGGED list for review generation
                    </p>
                  </div>
                </div>
              )}

              {!searchResults.amazon && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-gray-600">No Amazon product found for "{searchResults.searchTerm}"</p>
                </div>
              )}

              {/* Reddit Results */}
              {searchResults.reddit && searchResults.reddit.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Reddit Posts ({searchResults.reddit.length} found)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select posts to include when adding this product:
                  </p>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.reddit.map((post: any) => (
                      <div
                        key={post.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedRedditPosts.has(post.id)
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => toggleRedditPost(post.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRedditPosts.has(post.id)}
                            onChange={() => toggleRedditPost(post.id)}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-600">r/{post.subreddit}</span>
                              <span className="text-xs text-gray-500">
                                {post.score} upvotes • {post.num_comments} comments
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">{post.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{post.selftext}</p>
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View post →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!searchResults.reddit || searchResults.reddit.length === 0) && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-gray-600">No Reddit posts found for "{searchResults.searchTerm}"</p>
                </div>
              )}

              {/* Approve Button - Show if Reddit posts are selected (Amazon button is already shown above) */}
              {searchResults.amazon && searchResults.reddit && selectedRedditPosts.size > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleApproveResult}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                  >
                    ✅ Approve with Selected Reddit Posts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Collection Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Collection</h2>
          <p className="text-sm text-gray-600 mb-6">
            Collects Amazon Movers & Shakers, runs weekly Reddit scan (extracts product names from high-engagement posts), then matches them together.
          </p>
          
          <div className="space-y-3">
            {/* Main collection button */}
            <button
              onClick={runFullCollection}
              disabled={collectionStatus === 'running' || enrichStatus === 'running'}
              className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                collectionStatus === 'running'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : collectionStatus === 'success'
                  ? 'bg-green-500'
                  : collectionStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {collectionStatus === 'running'
                ? '🔄 Collecting Data...'
                : collectionStatus === 'success'
                ? '✅ Collection Complete!'
                : collectionStatus === 'error'
                ? '❌ Collection Failed'
                : '🚀 Run Full Collection'}
            </button>

            {/* Reddit enrichment button */}
            <button
              onClick={runRedditEnrichment}
              disabled={collectionStatus === 'running' || enrichStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                enrichStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : enrichStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : enrichStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              {enrichStatus === 'running'
                ? 'Running Weekly Reddit Scan...'
                : enrichStatus === 'success'
                ? '✅ Reddit Enriched!'
                : enrichStatus === 'error'
                ? '❌ Failed'
                : '📊 Run Weekly Reddit Scan'}
            </button>

            {/* Generate Content button */}
            <button
              onClick={handleGenerateAll}
              disabled={generateStatus === 'running' || collectionStatus === 'running' || enrichStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                generateStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : generateStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : generateStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-pink-100 hover:bg-pink-200 text-pink-700'
              }`}
            >
              {generateStatus === 'running'
                ? 'Generating Content...'
                : generateStatus === 'success'
                ? '✅ Content Generated!'
                : generateStatus === 'error'
                ? '❌ Failed'
                : '✨ Generate Content for All FLAGGED Products'}
            </button>

            {/* Scrape Amazon Data button */}
            <button
              onClick={handleScrapeAmazonData}
              disabled={scrapeStatus === 'running' || collectionStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                scrapeStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : scrapeStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : scrapeStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
              }`}
            >
              {scrapeStatus === 'running'
                ? 'Scraping Amazon Data...'
                : scrapeStatus === 'success'
                ? '✅ Scraping Complete!'
                : scrapeStatus === 'error'
                ? '❌ Failed'
                : '📥 Scrape Amazon Product Data (Reviews, Q&A, Metadata)'}
            </button>

            {/* Database Migration button */}
            <button
              onClick={handleMigrateDatabase}
              disabled={migrateStatus === 'running' || syncStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                migrateStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : migrateStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : migrateStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-teal-100 hover:bg-teal-200 text-teal-700'
              }`}
            >
              {migrateStatus === 'running'
                ? 'Running Migration...'
                : migrateStatus === 'success'
                ? '✅ Migration Complete!'
                : migrateStatus === 'error'
                ? '❌ Failed'
                : '🗄️ Run Database Migration'}
            </button>

            {/* Sync Schema button (for drift issues) */}
            <button
              onClick={handleSyncSchema}
              disabled={syncStatus === 'running' || migrateStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                syncStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : syncStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : syncStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
            >
              {syncStatus === 'running'
                ? 'Syncing Schema...'
                : syncStatus === 'success'
                ? '✅ Schema Synced!'
                : syncStatus === 'error'
                ? '❌ Failed'
                : '🔄 Sync Schema (Fix Drift Issues)'}
            </button>

            {/* Daily Update button */}
            <button
              onClick={handleDailyUpdate}
              disabled={dailyUpdateStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                dailyUpdateStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : dailyUpdateStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : dailyUpdateStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
              }`}
            >
              {dailyUpdateStatus === 'running'
                ? 'Updating Scores...'
                : dailyUpdateStatus === 'success'
                ? '✅ Update Complete!'
                : dailyUpdateStatus === 'error'
                ? '❌ Failed'
                : '🔄 Daily Update (Recalculate Age Decay)'}
            </button>

            {/* Recalculate All Scores button */}
            <button
              onClick={handleRecalculateAllScores}
              disabled={recalculateScoresStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                recalculateScoresStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : recalculateScoresStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : recalculateScoresStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
              }`}
            >
              {recalculateScoresStatus === 'running'
                ? 'Recalculating Scores...'
                : recalculateScoresStatus === 'success'
                ? '✅ Recalculation Complete!'
                : recalculateScoresStatus === 'error'
                ? '❌ Failed'
                : '🔢 Recalculate All Scores (Apply New Scoring Logic)'}
            </button>

            {/* Backfill Age Decay button */}
            <button
              onClick={handleBackfillAgeDecay}
              disabled={backfillStatus === 'running'}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                backfillStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : backfillStatus === 'success'
                  ? 'bg-green-100 text-green-800'
                  : backfillStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
            >
              {backfillStatus === 'running'
                ? 'Backfilling Data...'
                : backfillStatus === 'success'
                ? '✅ Backfill Complete!'
                : backfillStatus === 'error'
                ? '❌ Failed'
                : '📦 Backfill Age Decay (For Existing Products)'}
            </button>
          </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">What "Run Full Collection" does (Two-Phase Approach):</p>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                <li><strong>Phase 1:</strong> Collects from Amazon Movers & Shakers (primary source)</li>
                <li><strong>Phase 2:</strong> Searches Reddit for each Amazon product (adds context)</li>
                <li><strong>Phase 3:</strong> Early signal detection (catches Reddit trends before Amazon)</li>
                <li>Combines scores: Amazon (0-70) + Reddit bonus (0-30) = max 100 points</li>
              </ul>
            </div>

          {/* Status Messages */}
          {messages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {messages.slice(-10).reverse().map((msg, idx) => (
                    <div key={idx} className="text-sm text-gray-600 font-mono">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Management</h2>
              <p className="text-sm text-gray-600">View and manage flagged products ready for review generation</p>
            </div>
            <button
              onClick={() => fetchProducts(filterStatus === 'ALL' ? undefined : filterStatus)}
              disabled={loadingProducts}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50"
            >
              {loadingProducts ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Source Filter Tabs */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Filter by Source:</p>
            <div className="flex gap-2 border-b border-gray-200">
              {(['ALL', 'COMBINED', 'AMAZON_ONLY', 'REDDIT_ONLY'] as const).map((source) => {
                // Calculate count based on current products (filtered by status)
                const count = source === 'ALL' 
                  ? products.length
                  : products.filter(p => {
                      const hasAmazon = p.trendSignals?.some(s => s.source === 'amazon_movers')
                      const hasReddit = p.trendSignals?.some(s => s.source === 'reddit_skincare')
                      if (source === 'COMBINED') return hasAmazon && hasReddit
                      if (source === 'AMAZON_ONLY') return hasAmazon && !hasReddit
                      if (source === 'REDDIT_ONLY') return hasReddit && !hasAmazon
                      return true
                    }).length
                
                return (
                  <button
                    key={source}
                    onClick={() => setFilterSource(source)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      filterSource === source
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {source === 'ALL' ? 'All Sources' : source.replace('_', ' ')} {count > 0 && `(${count})`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">Filter by Status:</p>
            <div className="flex gap-2 border-b border-gray-200">
              {(['ALL', 'FLAGGED', 'DRAFT', 'PUBLISHED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    filterStatus === status
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {status} {status !== 'ALL' && `(${products.filter(p => p.status === status).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Products List */}
          {loadingProducts ? (
            <div className="text-center py-12 text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No {filterStatus === 'ALL' ? '' : filterStatus.toLowerCase()} products found.</p>
              <p className="text-sm text-gray-400">
                {filterStatus === 'FLAGGED' && 'Products flagged for review (typically score > 60, but you can generate content for any product)'}
                {filterStatus === 'DRAFT' && 'Products with generated reviews will appear here'}
                {filterStatus === 'PUBLISHED' && 'Published products will appear here'}
                {filterStatus === 'ALL' && 'No products in database yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {(() => {
                        // Try product imageUrl first
                        if (product.imageUrl) {
                          return (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to Amazon image if product image fails
                                if (product.amazonUrl) {
                                  const amazonImage = getAmazonImageUrl(product.amazonUrl)
                                  if (amazonImage) {
                                    (e.target as HTMLImageElement).src = amazonImage
                                  }
                                }
                              }}
                            />
                          )
                        }
                        
                        // Fallback to Amazon image URL
                        if (product.amazonUrl) {
                          const amazonImage = getAmazonImageUrl(product.amazonUrl)
                          if (amazonImage) {
                            return (
                              <img
                                src={amazonImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            )
                          }
                        }
                        
                        // No image available
                        return (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )
                      })()}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {product.name && !product.name.match(/^\$[\d.,\s-]+$/) 
                                ? product.name 
                                : product.amazonUrl 
                                  ? 'Product Name Missing (Click Amazon link)' 
                                  : 'Unnamed Product'}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              product.status === 'FLAGGED' ? 'bg-yellow-100 text-yellow-800' :
                              product.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {product.status}
                            </span>
                          </div>
                          {product.brand && (
                            <p className="text-sm text-gray-600 mb-2 font-medium">{product.brand}</p>
                          )}
                          {(!product.name || product.name.match(/^\$[\d.,\s-]+$/)) && (
                            <p className="text-xs text-orange-600 mb-2 italic">
                              ⚠️ Product name missing - Amazon scraper extracted price instead. Click Amazon link to see actual product.
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>Trend Score: <strong className="text-gray-900">{(product.currentScore ?? product.trendScore ?? 0).toFixed(0)}</strong></span>
                            {product.currentScore !== null && product.currentScore !== product.trendScore && (
                              <span className="text-xs text-gray-400">(base: {product.trendScore?.toFixed(0) ?? 'N/A'})</span>
                            )}
                            {product.price && (
                              <span>Price: <strong className="text-gray-900">${product.price.toFixed(2)}</strong></span>
                            )}
                            {/* Score breakdown */}
                            {product.trendSignals && product.trendSignals.length > 0 && (() => {
                              const hasAmazon = product.trendSignals.some(s => s.source === 'amazon_movers')
                              const hasReddit = product.trendSignals.some(s => s.source === 'reddit_skincare')
                              if (hasAmazon && hasReddit) {
                                return <span className="text-xs text-green-600">✓ Combined (Amazon + Reddit)</span>
                              } else if (hasAmazon) {
                                return <span className="text-xs text-orange-600">⚠ Amazon only</span>
                              } else if (hasReddit) {
                                return <span className="text-xs text-blue-600">⚠ Reddit only</span>
                              }
                              return null
                            })()}
                          </div>
                          
                          {/* Trend Signals */}
                          {product.trendSignals && product.trendSignals.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {/* Show only the highest/most recent Amazon sales increase */}
                              {(() => {
                                const amazonSignals = product.trendSignals
                                  .filter(s => s.source === 'amazon_movers')
                                  .sort((a, b) => {
                                    // Sort by sales jump % (highest first), then by metadata date (most recent first)
                                    const aJump = a.value || (a.metadata as any)?.salesJumpPercent || 0
                                    const bJump = b.value || (b.metadata as any)?.salesJumpPercent || 0
                                    if (bJump !== aJump) return bJump - aJump
                                    const aDate = new Date((a.metadata as any)?.detectedAt || a.detectedAt || 0)
                                    const bDate = new Date((b.metadata as any)?.detectedAt || b.detectedAt || 0)
                                    return bDate.getTime() - aDate.getTime()
                                  })
                                
                                if (amazonSignals.length > 0) {
                                  const topSignal = amazonSignals[0]
                                  const salesJump = topSignal.value || (topSignal.metadata as any)?.salesJumpPercent || 0
                                  if (salesJump > 0) {
                                    return (
                                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                        📈 Amazon: {salesJump.toLocaleString()}% sales increase
                                      </span>
                                    )
                                  }
                                  return (
                                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                      📈 Amazon: On Movers & Shakers
                                    </span>
                                  )
                                }
                                return null
                              })()}
                              {product.trendSignals
                                .filter(s => s.source === 'reddit_skincare')
                                .slice(0, 2) // Show top 2 Reddit signals
                                .map((signal, idx) => {
                                  const upvotes = signal.value || 0
                                  const metadata = signal.metadata as any
                                  const comments = metadata?.comments || 0
                                  const subreddit = metadata?.subreddit || 'reddit'
                                  
                                  return (
                                    <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      💬 r/{subreddit}: {upvotes.toLocaleString()} upvotes, {comments} comments
                                    </span>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-2">
                        {product.content?.slug ? (
                          <Link
                            href={`/products/${product.content.slug}`}
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View Page →
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">No review page yet</span>
                        )}
                        {product.amazonUrl && (
                          <a
                            href={addAmazonAffiliateTag(product.amazonUrl) || product.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-orange-600 hover:text-orange-800 underline"
                          >
                            Amazon →
                          </a>
                        )}
                        {product.trendSignals && product.trendSignals
                          .filter(s => s.source === 'reddit_skincare')
                          .slice(0, 1) // Show link to top Reddit post
                          .map((signal, idx) => {
                            const metadata = signal.metadata as any
                            let redditUrl = metadata?.url || ''
                            // Fix double URL prefix if present
                            if (redditUrl.startsWith('https://reddit.comhttps://')) {
                              redditUrl = redditUrl.replace('https://reddit.com', '')
                            } else if (redditUrl.startsWith('https://www.reddit.com')) {
                              // Already correct
                            } else if (redditUrl.startsWith('/')) {
                              redditUrl = `https://reddit.com${redditUrl}`
                            }
                            if (redditUrl && redditUrl.startsWith('http')) {
                              return (
                                <a
                                  key={idx}
                                  href={redditUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                  Reddit →
                                </a>
                              )
                            }
                            return null
                          })}
                        {!product.content?.slug && (
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-sm text-[var(--link-color)] hover:text-purple-800 underline"
                          >
                            Generate Detail Page →
                          </Link>
                        )}
                        {product.content?.slug && (
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Edit Detail Page →
                          </Link>
                        )}
                        <button
                          onClick={() => handleMergeClick(product.id, product.name || 'Unnamed Product')}
                          disabled={mergingProductId === product.id}
                          className="text-sm text-orange-600 hover:text-orange-800 underline disabled:opacity-50 disabled:cursor-not-allowed mr-3"
                        >
                          Mark as Duplicate
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product.id, product.name || 'Unnamed Product')}
                          disabled={deletingProductId === product.id}
                          className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingProductId === product.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Merge/Duplicate Modal */}
        {mergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Duplicate</h3>
              <p className="text-gray-600 mb-4">
                Merge <strong>"{mergeModal.duplicateName}"</strong> into an existing product. 
                All trend signals, reviews, and data will be transferred to the target product.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for existing product:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mergeSearchTerm}
                    onChange={(e) => {
                      setMergeSearchTerm(e.target.value)
                      // Debounce search
                      clearTimeout((window as any).mergeSearchTimeout)
                      ;(window as any).mergeSearchTimeout = setTimeout(() => {
                        handleMergeSearch()
                      }, 300)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleMergeSearch()
                      }
                    }}
                    placeholder="Search by product name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleMergeSearch}
                    className="px-4 py-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] text-white rounded-lg font-medium"
                  >
                    Search
                  </button>
                </div>
              </div>

              {mergeSearchResults.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Select target product:</p>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {mergeSearchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedTargetProduct(product.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selectedTargetProduct === product.id ? 'bg-purple-50 border-purple-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.brand && `${product.brand} • `}
                              Status: {product.status} • Score: {product.currentScore ?? product.trendScore ?? 0}
                              {product.content?.slug && ' • Has content'}
                            </p>
                          </div>
                          {selectedTargetProduct === product.id && (
                            <span className="text-[var(--link-color)]">✓ Selected</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mergeSearchTerm && mergeSearchResults.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">No products found. Try a different search term.</p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleMergeCancel}
                  disabled={mergingProductId !== null}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeConfirm}
                  disabled={mergingProductId !== null || !selectedTargetProduct}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mergingProductId ? 'Merging...' : 'Merge Products'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>"{deleteConfirm.productName}"</strong>? 
                This action cannot be undone and will delete the product, all associated trend signals, reviews, and content.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deletingProductId !== null}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingProductId !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {deletingProductId ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Generation Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Generation</h2>
          <p className="text-gray-600 mb-4">
            Content is generated using Claude AI with the voice of Alex Chen, a beauty editor who cuts through marketing BS and talks like a real person.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>✅ Generate review content for individual products (click "Generate Detail Page" on any product)</li>
            <li>✅ Generate content for all FLAGGED products at once (use button above) - or generate individually for any product</li>
            <li>✅ Generated content is saved as DRAFT status for review/editing</li>
            <li>✅ Content includes: Why It's Trending, The Good, The Bad, Who Should Try/Skip, Alternatives, FAQ</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
