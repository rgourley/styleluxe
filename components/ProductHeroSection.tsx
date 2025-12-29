'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { brandToSlug } from '@/lib/brands'

interface ProductHeroSectionProps {
  product: {
    id?: string
    name: string
    brand?: string | null
    price?: number | null
    currency?: string | null
    amazonUrl?: string | null
    content?: {
      hook?: string | null
      redditHotness?: number | null
    } | null
    metadata?: {
      starRating?: number | null
    } | null
  }
  stats: {
    salesSpike: number | null
    redditMentions: number | null
    redditHotnessLabel?: string | null
    redditScale?: string | null
  }
  timelineText: string
  amazonReviewCount: number | null
  amazonStarRating: number | null
  onAmazonClick: string
}


export default function ProductHeroSection({
  product,
  stats,
  timelineText,
  amazonReviewCount,
  amazonStarRating,
  onAmazonClick,
}: ProductHeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add fade-in animation on mount
    if (containerRef.current) {
      containerRef.current.style.opacity = '0'
      containerRef.current.style.transform = 'translateY(20px)'
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'
          containerRef.current.style.opacity = '1'
          containerRef.current.style.transform = 'translateY(0)'
        }
      })
    }
  }, [])

  return (
    <div ref={containerRef} style={{ opacity: 0 }}>
      {/* Brand */}
      {product.brand && (
        <Link
          href={`/brands/${brandToSlug(product.brand)}`}
          style={{
            fontSize: '12px',
            fontWeight: '400',
            color: '#8b8b8b',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '8px',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#E07856'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8b8b8b'
          }}
        >
          {product.brand}
        </Link>
      )}

      {/* Product Name - H1 */}
      <h1 style={{
        fontSize: '42px',
        fontWeight: '700',
        color: '#2D2D2D',
        marginBottom: '20px',
        letterSpacing: '-0.02em',
        lineHeight: '1.2',
      }}>
        {product.name}
      </h1>

      {/* Unified Badges Section */}
      {((amazonStarRating && amazonStarRating > 0) || (stats.salesSpike && stats.salesSpike > 0) || (stats.redditMentions && stats.redditMentions > 0)) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '28px',
        }}>
          {/* Badge 1 - Amazon Rating */}
          {amazonStarRating && amazonStarRating > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFBF5',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #FFE4E9',
              gap: '5px',
            }}>
              {/* Stars */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
              }}>
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      color: i < Math.round(amazonStarRating) ? '#FFA41C' : '#e0e0e0',
                      fontSize: '11px',
                    }}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              {/* Rating Number */}
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#2D2D2D',
              }}>
                {amazonStarRating.toFixed(1)}
              </span>
              {/* Review Count */}
              {amazonReviewCount && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '400',
                  color: '#6b6b6b',
                }}>
                  ({amazonReviewCount >= 1000 ? `${(amazonReviewCount / 1000).toFixed(1)}k` : amazonReviewCount.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Badge 2 - Sales Spike */}
          {stats.salesSpike && stats.salesSpike > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFF5F7',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #FFE4E9',
              gap: '5px',
            }}>
              {/* Fire Emoji */}
              <span style={{ fontSize: '13px' }}>🔥</span>
              {/* Percentage */}
              <span style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#FF6B6B',
              }}>
                +{stats.salesSpike}%
              </span>
            </div>
          )}

          {/* Badge 3 - Reddit Status */}
          {((stats.redditMentions && stats.redditMentions > 0) || stats.redditHotnessLabel || stats.redditScale) && (() => {
            // Determine Reddit status and emoji
            let emoji = '💬'
            let statusText = 'Trending'
            const redditHotness = product.content?.redditHotness || 0
            
            if (redditHotness >= 5) {
              emoji = '🔥'
              statusText = 'Breakout'
            } else if (redditHotness >= 4) {
              emoji = '🔥'
              statusText = 'Hot'
            } else if (redditHotness >= 3) {
              emoji = '💬'
              statusText = 'Trending'
            } else if (redditHotness >= 2) {
              emoji = '↗'
              statusText = 'Rising'
            } else if (stats.redditMentions && stats.redditMentions >= 500) {
              emoji = '💬'
              statusText = `${Math.round(stats.redditMentions / 100) * 100}+ mentions`
            } else if (stats.redditHotnessLabel) {
              statusText = stats.redditHotnessLabel
            } else if (stats.redditScale) {
              statusText = stats.redditScale.replace(/[🔥📈📊💬👀]/g, '').trim()
            }

            return (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#EBF5EF',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #DDE9E3',
                gap: '5px',
              }}>
                {/* Emoji */}
                <span style={{ fontSize: '13px' }}>{emoji}</span>
                {/* Status Text */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#2D2D2D',
                }}>
                  {statusText}
                </span>
                {/* Separator & Platform */}
                {!statusText.includes('mentions') && (
                  <>
                    <span style={{
                      fontSize: '11px',
                      color: '#6b6b6b',
                    }}>
                      •
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '400',
                      color: '#6b6b6b',
                    }}>
                      Reddit
                    </span>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* CTA Button with Price */}
      {product.amazonUrl && (
        <a
          href={onAmazonClick}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // Track click if product ID is available
            if (product.id) {
              fetch('/api/track-click', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId: product.id }),
              }).catch((error) => {
                // Silently fail - tracking shouldn't break the link
                console.error('Failed to track click:', error)
              })
            }
          }}
          style={{
            display: 'block',
            width: '100%',
            height: '58px',
            backgroundColor: '#FF6B6B',
            color: '#FFFFFF',
            borderRadius: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600',
            textAlign: 'center',
            textDecoration: 'none',
            lineHeight: '58px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E07856'
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF6B6B'
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {product.price ? `$${product.price.toFixed(2)} on Amazon →` : 'Buy on Amazon →'}
        </a>
      )}

      {/* Product Hook/Description */}
      {product.content?.hook && (
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#2D2D2D',
          fontFamily: 'var(--font-atkinson), sans-serif',
          fontWeight: '400',
        }}>
          {product.content.hook}
        </p>
      )}
    </div>
  )
}

