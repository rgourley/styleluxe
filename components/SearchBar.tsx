'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  initialQuery?: string
}

export default function SearchBar({ initialQuery = '' }: SearchBarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [mounted, setMounted] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    const currentQuery = params.get('q') || ''
    
    if (debouncedQuery !== currentQuery) {
      if (debouncedQuery.trim()) {
        params.set('q', debouncedQuery.trim())
        router.push(`/?${params.toString()}`)
      } else {
        params.delete('q')
        const newUrl = params.toString() ? `/?${params.toString()}` : '/'
        router.push(newUrl)
      }
    }
  }, [debouncedQuery, router, mounted])

  const handleClear = () => {
    setSearchQuery('')
    router.push('/')
  }

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full px-2.5 py-1 pr-7 border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm"
        />
        {mounted && searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
            aria-label="Clear search"
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
