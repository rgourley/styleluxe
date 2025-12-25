'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'

export default function NotFound() {
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])

  useEffect(() => {
    // Fetch 3 trending products
    fetch('/api/products?status=PUBLISHED&limit=3')
      .then(res => res.json())
      .then(data => setSuggestedProducts(data.products || []))
      .catch(err => console.error('Error fetching suggested products:', err))
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-bold text-[#2D2D2D] mb-4 tracking-tight">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-[#2D2D2D] mb-6">
            Product Not Found
          </h2>
          <p className="text-xl text-[#6b6b6b] max-w-2xl mx-auto mb-8">
            Sorry, we couldn't find the product you're looking for. It may have been removed or the link might be incorrect.
          </p>
          <Link 
            href="/"
            style={{
              display: 'inline-block',
              backgroundColor: '#FF6B6B',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E07856'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF6B6B'}
          >
            ← Back to Homepage
          </Link>
        </div>

        {suggestedProducts.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold text-[#2D2D2D] mb-6 text-center">
              Check Out These Trending Products
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {suggestedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Link href="/" className="text-2xl font-bold tracking-tight inline-block mb-6">
              <span style={{ 
                fontFamily: 'var(--font-instrument), sans-serif',
                fontWeight: '400',
                color: '#2D2D2D',
              }}>Style</span>
              <span style={{
                fontFamily: 'var(--font-instrument), sans-serif',
                fontWeight: '500',
                background: 'linear-gradient(135deg, #FF6B6B, #E07856)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Luxe</span>
            </Link>
            <p className="text-sm text-[#6b6b6b]">
              © 2025 StyleLuxe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}


