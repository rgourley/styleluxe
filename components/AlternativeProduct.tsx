'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AlternativeProductProps {
  productName: string
  price: string
  description: string
  matchedProduct?: {
    id: string
    name: string
    slug: string
  } | null
}

export default function AlternativeProduct({ 
  productName, 
  price, 
  description, 
  matchedProduct 
}: AlternativeProductProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  // Remove leading dash and trim whitespace
  const cleanDescription = description.replace(/^-\s*/, '').trim()
  
  // Check if product name contains a "+" indicating multiple products
  const hasMultipleProducts = productName.includes(' + ')
  
  // Render product link - use internal link if matched, otherwise Amazon search
  const renderProductLink = (name: string, index: number) => {
    // If we have a matched product for this name, use internal link
    // For multiple products, we'd need matchedProducts array - for now, use Amazon
    const linkProps = {
      style: {
        color: '#FF6B6B',
        fontWeight: '600',
        textDecoration: 'none',
        borderBottom: hoveredIndex === index ? '2px solid #FF6B6B' : '2px solid transparent',
        transition: 'border-color 0.2s',
      } as React.CSSProperties,
      onMouseEnter: () => setHoveredIndex(index),
      onMouseLeave: () => setHoveredIndex(null),
    }

    if (matchedProduct && !hasMultipleProducts && name === productName) {
      // Use internal product link
      return (
        <Link href={`/products/${matchedProduct.slug}`} {...linkProps}>
          {name}
        </Link>
      )
    }

    // Fallback to Amazon search
    return (
      <a 
        href={`https://www.amazon.com/s?k=${encodeURIComponent(name)}&tag=styleluxe0f-20`}
        target="_blank"
        rel="noopener noreferrer"
        {...linkProps}
      >
        {name}
      </a>
    )
  }
  
  if (hasMultipleProducts) {
    // Split by " + " and create separate links for each product
    const products = productName.split(' + ').map(p => p.trim())
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '8px' }}>
          {products.map((product, index) => (
            <span key={index}>
              {renderProductLink(product, index)}
              {index < products.length - 1 && <span style={{ color: '#2D2D2D', margin: '0 4px' }}> + </span>}
            </span>
          ))}
          {price && <span style={{ color: '#2D2D2D', fontWeight: '600', marginLeft: '8px' }}>({price})</span>}
        </p>
        <p style={{ color: '#2D2D2D', lineHeight: '1.7' }}>{cleanDescription}</p>
      </div>
    )
  }
  
  // Single product
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ marginBottom: '8px' }}>
        {renderProductLink(productName, 0)}
        {price && <span style={{ color: '#2D2D2D', fontWeight: '600', marginLeft: '8px' }}>({price})</span>}
      </p>
      <p style={{ color: '#2D2D2D', lineHeight: '1.7' }}>{cleanDescription}</p>
    </div>
  )
}

