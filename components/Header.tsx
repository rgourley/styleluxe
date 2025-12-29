'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCategorySlug, categoryMetadata } from '@/lib/category-metadata'

const topLevelCategories = ['Skincare', 'Makeup', 'Hair Care']
const allCategories = [
  'Skincare',
  'Makeup',
  'Hair Care',
  'Body Care',
  'Fragrance',
  'Tools & Accessories',
  'Men\'s Grooming',
  'Other'
]

export default function Header() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/trending?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const handleCategoryClick = (category: string) => {
    const categorySlug = getCategorySlug(category)
    if (categorySlug) {
      router.push(`/trending/${categorySlug}`)
    } else {
      // Fallback to old URL structure if slug not found
      router.push(`/trending?category=${encodeURIComponent(category)}`)
    }
    setIsDropdownOpen(false)
  }

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false)
    }, 300) // 300ms delay before closing
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMobileMenuOpen && !target.closest('header')) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <header style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #F0F0F0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '72px',
          gap: '16px',
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontSize: '24px',
            fontWeight: '400',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: '400',
              color: '#B76E79',
            }}>Beauty</span>
            <span style={{
              fontFamily: 'var(--font-playfair), serif',
              fontWeight: '400',
              color: '#B76E79',
            }}>Finder</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center flex-grow justify-end" style={{ gap: '24px' }}>
            {/* Top-Level Category Links */}
            {topLevelCategories.map((category) => {
              const categorySlug = getCategorySlug(category)
              const categoryUrl = categorySlug ? `/trending/${categorySlug}` : `/trending?category=${encodeURIComponent(category)}`
              return (
                <Link
                  key={category}
                  href={categoryUrl}
                  style={{
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#2D2D2D',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B6B'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#2D2D2D'}
                >
                  {category}
                </Link>
              )
            })}

            {/* Categories Dropdown */}
            <div 
              style={{ position: 'relative' }} 
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button style={{
                fontSize: '15px',
                fontWeight: '500',
                color: isDropdownOpen ? '#FF6B6B' : '#2D2D2D',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'color 0.2s',
              }}>
                Categories <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '-16px',
                  marginTop: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F0F0F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '8px 0',
                  minWidth: '200px',
                  zIndex: 1000,
                }}>
                  {/* All Categories Link */}
                  <Link
                    href="/trending"
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: '#FF6B6B',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    All Categories
                  </Link>
                  <div style={{
                    height: '1px',
                    backgroundColor: '#F0F0F0',
                    margin: '4px 0',
                  }} />
                  {/* Individual Categories */}
                  {allCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 20px',
                        fontSize: '14px',
                        color: '#2D2D2D',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F7'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{
              position: 'relative',
              width: '280px',
            }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '16px',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search trending products..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F0F0F0',
                  borderRadius: '24px',
                  padding: '10px 20px 10px 44px',
                  fontSize: '14px',
                  color: '#2D2D2D',
                  outline: 'none',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#F0F0F0'}
              />
            </form>

            {/* About Link */}
            <Link href="/about" style={{
              fontSize: '15px',
              fontWeight: '500',
              color: '#2D2D2D',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B6B'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#2D2D2D'}>
              About
            </Link>

            {/* All Trending */}
            <Link href="/trending" style={{
              fontSize: '15px',
              fontWeight: '500',
              color: '#2D2D2D',
              textDecoration: 'none',
              backgroundColor: '#FFF5F7',
              padding: '8px 16px',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFE4E9'
              e.currentTarget.style.color = '#FF6B6B'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF5F7'
              e.currentTarget.style.color = '#2D2D2D'
            }}>
              All Trending
            </Link>
          </nav>

          {/* Mobile Menu Icon - Hidden on desktop, visible on mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#2D2D2D',
              width: '40px',
              height: '40px',
            }} 
            className="flex md:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div style={{
            display: 'block',
            padding: '20px 0',
            borderTop: '1px solid #F0F0F0',
            marginTop: '8px',
            animation: 'slideDown 0.2s ease-out',
          }} className="block md:hidden">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} style={{
              position: 'relative',
              width: '100%',
              marginBottom: '20px',
            }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '16px',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search trending products..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F0F0F0',
                  borderRadius: '24px',
                  padding: '12px 20px 12px 44px',
                  fontSize: '14px',
                  color: '#2D2D2D',
                  outline: 'none',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#F0F0F0'}
              />
            </form>

            {/* Mobile Navigation Links */}
            <nav style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <Link 
                href="/trending" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2D2D2D',
                  textDecoration: 'none',
                  padding: '12px 0',
                  borderBottom: '1px solid #F0F0F0',
                }}
              >
                All Trending
              </Link>

              {/* Mobile Categories */}
              <div style={{ marginTop: '8px' }}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#2D2D2D',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '12px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  Categories <span style={{ fontSize: '12px' }}>{isDropdownOpen ? '▲' : '▼'}</span>
                </button>
                
                {isDropdownOpen && (
                  <div style={{
                    paddingLeft: '16px',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    {allCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          handleCategoryClick(category)
                          setIsMobileMenuOpen(false)
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '10px 0',
                          fontSize: '14px',
                          color: '#6b6b6b',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link 
                href="/about" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2D2D2D',
                  textDecoration: 'none',
                  padding: '12px 0',
                  borderTop: '1px solid #F0F0F0',
                  marginTop: '8px',
                  paddingTop: '20px',
                }}
              >
                About
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

