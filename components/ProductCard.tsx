'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTrendEmoji, getTrendLabel, formatTrendDuration, getSalesSpikePercent } from '@/lib/product-utils'
import { getAmazonImageUrl } from '@/lib/amazon-image'
import { addAmazonAffiliateTag } from '@/lib/amazon-affiliate'
import { getTrendBadge, getTimelineText } from '@/lib/age-decay'
import Sparkline from './Sparkline'

export default function ProductCard({ product, priority = false }: { product: any; priority?: boolean }) {
  const currentScore = product.currentScore ?? product.trendScore ?? 0
  const baseScore = product.baseScore ?? product.trendScore ?? 0
  const daysTrending = product.daysTrending ?? 0
  const trendSignals = product.trendSignals || []
  
  const trendBadge = getTrendBadge(currentScore)
  const timelineText = daysTrending > 0 ? getTimelineText(daysTrending) : null
  
  const trendEmoji = trendBadge.emoji
  const trendLabel = trendBadge.label
  const trendDuration = timelineText || formatTrendDuration(trendSignals)
  const salesSpike = getSalesSpikePercent(trendSignals)
  const slug = product.content?.slug || `product-${product.id}`
  
  // Get a short user quote from the AI-generated "What Real Users Say" section
  const getUserQuote = () => {
    const whatRealUsersSay = product.content?.whatRealUsersSay
    
    if (!whatRealUsersSay) return null
    
    // Method 1: Extract text before the first dash (user attribution)
    // This works best for format: 'Quote text' - attribution
    const beforeDash = whatRealUsersSay.split(' - ')[0]
    if (beforeDash && beforeDash.length >= 20 && beforeDash.length <= 200) {
      // Remove leading/trailing quote marks if present
      const cleaned = beforeDash.replace(/^['""']/, '').replace(/['""']$/, '').trim()
      if (cleaned.length >= 20 && cleaned.length <= 200) {
        return cleaned
      }
    }
    
    // Method 2: Look for text in double quotes, curly quotes, or single quotes
    const quoteMatch = whatRealUsersSay.match(/"([^"]{20,150})"/) ||  // Double quotes
                       whatRealUsersSay.match(/"([^"]{20,150})"/) ||  // Curly quotes
                       whatRealUsersSay.match(/'([^']{20,150})'/)     // Single quotes
    
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim()
    }
    
    return null
  }
  
  const userQuote = getUserQuote()
  
  // Fetch sparkline data
  const [sparklineData, setSparklineData] = useState<number[]>([])
  useEffect(() => {
    // Only fetch if product has content (published)
    if (product.content?.slug) {
      fetch(`/api/products/${product.id}/sparkline`)
        .then(res => res.json())
        .then(data => {
          if (data.scores && data.scores.length > 0) {
            setSparklineData(data.scores)
          }
        })
        .catch(() => {
          // Silently fail if no data available
        })
    }
  }, [product.id, product.content?.slug])
  
  const [imageSrc, setImageSrc] = useState(() => {
    if (product.imageUrl) {
      // If it's an R2 URL (contains r2.dev or r2.cloudflarestorage.com), use it directly
      if (product.imageUrl.includes('r2.dev') || product.imageUrl.includes('r2.cloudflarestorage.com')) {
        return product.imageUrl
      }
      // If it's not an Amazon URL (e.g., base64, other CDN), use it
      if (!product.imageUrl.includes('amazon') && !product.imageUrl.includes('amazonaws') && product.imageUrl.startsWith('http')) {
        return product.imageUrl
      }
      // If it's an Amazon URL, we'll try to fall back to Amazon image URL generator
      // but Amazon may block it, so we'll show a placeholder if it fails
    }
    // Fallback to Amazon image URL generator (may be blocked)
    if (product.amazonUrl) {
      return getAmazonImageUrl(product.amazonUrl) || null
    }
    return null
  })

  const handleImageError = () => {
    // If image failed to load, try Amazon image URL generator as fallback
    if (product.amazonUrl) {
      const amazonImage = getAmazonImageUrl(product.amazonUrl)
      if (amazonImage && imageSrc !== amazonImage) {
        setImageSrc(amazonImage)
      } else {
        // If Amazon image also fails, set to null to show placeholder
        setImageSrc(null)
      }
    } else {
      // No fallback available, show placeholder
      setImageSrc(null)
    }
  }

  return (
    <Link 
      href={`/products/${slug}`}
      suppressHydrationWarning
      style={{
        display: 'block',
        backgroundColor: '#FFFFFF',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#F0F0F0',
        borderRadius: '1rem',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#FFF5F7'
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#FFFFFF'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Product Image */}
      <div suppressHydrationWarning style={{
        width: '100%',
        paddingBottom: '100%', // Creates 1:1 aspect ratio
        backgroundColor: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={product.name}
            suppressHydrationWarning
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            onError={handleImageError}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div suppressHydrationWarning style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f8f8',
            backgroundImage: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          }}>
            {/* Generic beauty product placeholder */}
            <div style={{
              width: '60%',
              height: '60%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c0c0c0',
            }}>
              <svg style={{ width: '3rem', height: '3rem', marginBottom: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.77 0-1.96-1.7-2.76-3.66-3.21z"/>
              </svg>
              <span style={{ fontSize: '0.75rem', textAlign: 'center', color: '#a0a0a0' }}>Product Image</span>
            </div>
          </div>
        )}
        
        {/* Trend Badge */}
        <div suppressHydrationWarning style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          paddingTop: '0.375rem',
          paddingBottom: '0.375rem',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          <span suppressHydrationWarning style={{ fontSize: '1.125rem' }}>{trendEmoji}</span>
          <span suppressHydrationWarning style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#2D2D2D',
          }}>{currentScore.toFixed(0)}</span>
        </div>
      </div>

      {/* Product Info */}
      <div suppressHydrationWarning style={{ padding: '1.5rem' }}>
        {/* Trend Indicators */}
        <div suppressHydrationWarning style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}>
          <span 
            suppressHydrationWarning
            style={{
              fontSize: '0.75rem',
              fontWeight: trendBadge.color === 'red' || trendBadge.color === 'orange' ? '600' : '400',
              paddingLeft: '0.625rem',
              paddingRight: '0.625rem',
              paddingTop: '0.25rem',
              paddingBottom: '0.25rem',
              borderRadius: '9999px',
              display: 'inline-block',
              backgroundColor: 
                trendBadge.color === 'red' ? '#FF6B6B' :  // Peak Viral - coral
                trendBadge.color === 'orange' ? '#FF6B6B' :  // Hot - coral
                trendBadge.color === 'yellow' ? '#A8D5BA' :  // Rising - sage
                '#FFF5F7',  // Watching - blush pink
              color:
                trendBadge.color === 'red' ? '#ffffff' :  // Peak Viral - white text
                trendBadge.color === 'orange' ? '#ffffff' :  // Hot - white text
                trendBadge.color === 'yellow' ? '#2D2D2D' :  // Rising - dark text
                '#2D2D2D',  // Watching - dark text
              border: trendBadge.color === 'gray' ? '1px solid #FFE4E9' : 'none',  // Watching - pink border
            }}
          >
            {trendLabel}
          </span>
          {timelineText && (
            <span suppressHydrationWarning style={{
              fontSize: '0.75rem',
              color: '#8b8b8b',
            }}>{timelineText}</span>
          )}
          {salesSpike && (
            <span suppressHydrationWarning style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#16a34a',
            }}>{salesSpike}</span>
          )}
          {sparklineData.length > 0 && (
            <div suppressHydrationWarning style={{
              display: 'flex',
              alignItems: 'center',
            }}>
              <Sparkline data={sparklineData} width={60} height={20} color="#E07856" />
            </div>
          )}
        </div>

        {/* Product Name */}
        <h3 suppressHydrationWarning style={{
          fontWeight: '600',
          fontSize: '1.125rem',
          color: '#2D2D2D',
          marginBottom: '0.5rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.375',
        }}>
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand && (
          <p suppressHydrationWarning style={{
            fontSize: '0.875rem',
            color: '#6b6b6b',
            marginBottom: '0.75rem',
            fontWeight: '300',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>{product.brand}</p>
        )}

        {/* Price */}
        {product.price && (
          <p suppressHydrationWarning style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#2D2D2D',
            marginBottom: '1rem',
            letterSpacing: '-0.025em',
            fontFamily: 'var(--font-atkinson), sans-serif',
          }}>
            ${product.price.toFixed(2)}
          </p>
        )}

        {/* User Quote or Hook */}
        {userQuote ? (
          <p suppressHydrationWarning style={{
            fontSize: '0.875rem',
            color: '#2D2D2D',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '1.25rem',
            lineHeight: '1.75',
            fontWeight: '300',
            fontStyle: 'italic',
          }}>
            "{userQuote}"
          </p>
        ) : product.content?.hook ? (
          <p suppressHydrationWarning style={{
            fontSize: '0.875rem',
            color: '#2D2D2D',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '1.25rem',
            lineHeight: '1.75',
            fontWeight: '300',
          }}>
            {product.content.hook}
          </p>
        ) : (
          <p suppressHydrationWarning style={{
            fontSize: '0.875rem',
            fontStyle: 'italic',
            color: '#8b8b8b',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '1.25rem',
            fontWeight: '300',
          }}>
            Review coming soon...
          </p>
        )}

        {/* Read More Link */}
        <div suppressHydrationWarning style={{
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#E07856',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          transition: 'color 0.2s ease',
        }}>
          Read review
          <span suppressHydrationWarning style={{ transition: 'transform 0.2s ease' }}>→</span>
        </div>
      </div>
    </Link>
  )
}
