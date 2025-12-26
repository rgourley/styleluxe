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
  status: 'FLAGGED' | 'DRAFT' | 'PUBLISHED'
  imageUrl: string | null
  amazonUrl: string | null
  content: { slug: string } | null
  trendSignals?: TrendSignal[]
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Check if already authenticated (stored in sessionStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth')
      if (auth === 'true') {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple password check - in production you'd want to verify this against an API
    if (password === 'StyleLuxe2025!Admin') {
      sessionStorage.setItem('admin_auth', 'true')
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Incorrect password')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Access</h1>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
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

  return <AdminDashboard />
}

function AdminDashboard() {
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('idle')
  const [messages, setMessages] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch('/api/products?limit=20')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Style<span className="text-gray-600">Luxe</span>
            </Link>
            <div className="flex items-center gap-4">
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Simplified admin access - manage your products</p>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>
            <button
              onClick={fetchProducts}
              disabled={loadingProducts}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50"
            >
              {loadingProducts ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loadingProducts ? (
            <div className="text-center py-12 text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No products found</div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">{product.name}</h3>
                      {product.brand && <p className="text-sm text-gray-600 mb-2">{product.brand}</p>}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Score: <strong>{product.trendScore.toFixed(0)}</strong></span>
                        {product.price && <span>Price: <strong>${product.price.toFixed(2)}</strong></span>}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          product.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                          product.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {product.content?.slug && (
                          <Link
                            href={`/products/${product.content.slug}`}
                            target="_blank"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View Page →
                          </Link>
                        )}
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          {product.content?.slug ? 'Edit' : 'Generate Content'} →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
