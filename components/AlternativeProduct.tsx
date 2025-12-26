'use client'

import { useState } from 'react'

interface AlternativeProductProps {
  productName: string
  price: string
  description: string
}

export default function AlternativeProduct({ productName, price, description }: AlternativeProductProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Create Amazon search URL with affiliate tag
  const searchQuery = encodeURIComponent(productName)
  const amazonSearchUrl = `https://www.amazon.com/s?k=${searchQuery}&tag=styleluxe0f-20`
  
  // Remove leading dash and trim whitespace
  const cleanDescription = description.replace(/^-\s*/, '').trim()
  
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
            borderBottom: isHovered ? '2px solid #FF6B6B' : '2px solid transparent',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {productName}
        </a>
        {price && <span style={{ color: '#2D2D2D', fontWeight: '600', marginLeft: '8px' }}>({price})</span>}
      </p>
      <p style={{ color: '#2D2D2D', lineHeight: '1.7' }}>{cleanDescription}</p>
    </div>
  )
}

