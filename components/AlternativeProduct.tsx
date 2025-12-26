'use client'

import { useState } from 'react'

interface AlternativeProductProps {
  productName: string
  price: string
  description: string
}

export default function AlternativeProduct({ productName, price, description }: AlternativeProductProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  // Remove leading dash and trim whitespace
  const cleanDescription = description.replace(/^-\s*/, '').trim()
  
  // Check if product name contains a "+" indicating multiple products
  const hasMultipleProducts = productName.includes(' + ')
  
  if (hasMultipleProducts) {
    // Split by " + " and create separate links for each product
    const products = productName.split(' + ').map(p => p.trim())
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '8px' }}>
          {products.map((product, index) => (
            <span key={index}>
              <a 
                href={`https://www.amazon.com/s?k=${encodeURIComponent(product)}&tag=styleluxe0f-20`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#FF6B6B',
                  fontWeight: '600',
                  textDecoration: 'none',
                  borderBottom: hoveredIndex === index ? '2px solid #FF6B6B' : '2px solid transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {product}
              </a>
              {index < products.length - 1 && <span style={{ color: '#2D2D2D', margin: '0 4px' }}> + </span>}
            </span>
          ))}
          {price && <span style={{ color: '#2D2D2D', fontWeight: '600', marginLeft: '8px' }}>({price})</span>}
        </p>
        <p style={{ color: '#2D2D2D', lineHeight: '1.7' }}>{cleanDescription}</p>
      </div>
    )
  }
  
  // Single product - original behavior
  const searchQuery = encodeURIComponent(productName)
  const amazonSearchUrl = `https://www.amazon.com/s?k=${searchQuery}&tag=styleluxe0f-20`
  
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ marginBottom: '8px' }}>
        <a 
          href={amazonSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#FF6B6B',
            fontWeight: '600',
            textDecoration: 'none',
            borderBottom: hoveredIndex === 0 ? '2px solid #FF6B6B' : '2px solid transparent',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={() => setHoveredIndex(0)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {productName}
        </a>
        {price && <span style={{ color: '#2D2D2D', fontWeight: '600', marginLeft: '8px' }}>({price})</span>}
      </p>
      <p style={{ color: '#2D2D2D', lineHeight: '1.7' }}>{cleanDescription}</p>
    </div>
  )
}

