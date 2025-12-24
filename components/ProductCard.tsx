'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getTrendEmoji, getTrendLabel, formatTrendDuration, getSalesSpikePercent } from '@/lib/product-utils'
import { getAmazonImageUrl } from '@/lib/amazon-image'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'
import { getTrendBadge, getTimelineText } from '@/lib/age-decay'

export default function ProductCard({ product, priority = false }: { product: any; priority?: boolean }) {
  // Use new age decay system if available, fallback to legacy
  const currentScore = product.currentScore ?? product.trendScore ?? 0
  const baseScore = product.baseScore ?? product.trendScore ?? 0
  const daysTrending = product.daysTrending ?? 0
  const trendSignals = product.trendSignals || []
  
  // Get trend badge from new system
  const trendBadge = getTrendBadge(currentScore)
  const timelineText = daysTrending > 0 ? getTimelineText(daysTrending) : null
  
  // Legacy fallback
  const trendEmoji = trendBadge.emoji
  const trendLabel = trendBadge.label
  const trendDuration = timelineText || formatTrendDuration(trendSignals)
  const salesSpike = getSalesSpikePercent(trendSignals)
  const slug = product.content?.slug || `product-${product.id}`
  
  // Determine image source (with fallback)
  // Skip .gif files and use Amazon image URL instead
  const [imageSrc, setImageSrc] = useState(() => {
    // If imageUrl is a .gif or invalid, use Amazon fallback
    if (product.imageUrl && !product.imageUrl.endsWith('.gif') && product.imageUrl.startsWith('http')) {
      return product.imageUrl
    }
    // Use Amazon image URL as primary or fallback
    if (product.amazonUrl) {
      return getAmazonImageUrl(product.amazonUrl) || null
    }
    return null
  })

  const handleImageError = () => {
    // Fallback to Amazon image if product image fails
    if (product.amazonUrl && imageSrc !== getAmazonImageUrl(product.amazonUrl)) {
      const amazonImage = getAmazonImageUrl(product.amazonUrl)
      if (amazonImage) {
        setImageSrc(amazonImage)
      }
    }
  }

  return (
    <Link 
      href={`/products/${slug}`}
      className="block bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
    >
      {/* Product Image */}
      <div className="aspect-square bg-[#f5f5f5] relative overflow-hidden">
        {imageSrc ? (
          // Use regular img tag for all images to avoid hydration issues completely
          <img 
            src={imageSrc} 
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            onError={handleImageError}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#b8b8b8]">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Trend Badge */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
          <span className="text-lg">{trendEmoji}</span>
          <span className="text-sm font-semibold text-[#1a1a1a]">{currentScore.toFixed(0)}</span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        {/* Trend Indicators */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            trendBadge.color === 'red' ? 'bg-red-50 text-red-700' :
            trendBadge.color === 'orange' ? 'bg-orange-50 text-orange-700' :
            trendBadge.color === 'yellow' ? 'bg-yellow-50 text-yellow-700' :
            'bg-[#f5f5f5] text-[#6b6b6b]'
          }`}>
            {trendLabel}
          </span>
          {timelineText && (
            <span className="text-xs text-[#8b8b8b]">{timelineText}</span>
          )}
          {salesSpike && (
            <span className="text-xs font-semibold text-green-600">{salesSpike}</span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-lg text-[#1a1a1a] mb-2 line-clamp-2 group-hover:text-[#8b5cf6] transition-colors leading-snug">
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand && (
          <p className="text-sm text-[#6b6b6b] mb-3 font-light tracking-wide uppercase">{product.brand}</p>
        )}

        {/* Price */}
        {product.price && (
          <p className="text-2xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
            ${product.price.toFixed(2)}
          </p>
        )}

        {/* Hook/Description */}
        {product.content?.hook ? (
          <p className="text-sm text-[#4a4a4a] line-clamp-2 mb-5 leading-relaxed font-light">
            {product.content.hook}
          </p>
        ) : (
          <p className="text-sm text-[#8b8b8b] italic line-clamp-2 mb-5 font-light">
            Review coming soon...
          </p>
        )}

        {/* Read More Link */}
        <div className="text-sm font-medium text-[#8b5cf6] group-hover:text-[#7c3aed] transition-colors flex items-center gap-1">
          Read review
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </Link>
  )
}

