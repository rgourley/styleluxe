'use client'

import { useState } from 'react'
import { getAmazonImageUrl } from '@/lib/amazon-image'

interface ProductImageProps {
  imageUrl: string | null
  amazonUrl: string | null
  productName: string
  category?: string | null
}

export default function ProductImage({ imageUrl, amazonUrl, productName, category }: ProductImageProps) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(() => {
    // Priority: 1) product.imageUrl (if valid), 2) Amazon image from URL
    if (imageUrl && !imageUrl.endsWith('.gif') && imageUrl.startsWith('http')) {
      return imageUrl
    }
    if (amazonUrl) {
      return getAmazonImageUrl(amazonUrl)
    }
    return null
  })
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError && amazonUrl && currentImageUrl !== getAmazonImageUrl(amazonUrl)) {
      // Try Amazon fallback
      const amazonImg = getAmazonImageUrl(amazonUrl)
      if (amazonImg) {
        setCurrentImageUrl(amazonImg)
        setHasError(true) // Prevent infinite loop
      } else {
        setCurrentImageUrl(null)
      }
    } else {
      setCurrentImageUrl(null)
    }
  }

  if (!currentImageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <img 
      src={currentImageUrl} 
      alt={`${productName} - Trending ${category || 'Beauty'} Product`}
      className="w-full h-full object-cover"
      onError={handleError}
    />
  )
}

