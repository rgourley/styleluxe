'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const categories = [
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/trending?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/trending?category=${encodeURIComponent(category)}`)
    setIsDropdownOpen(false)
  }

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
          gap: '32px',
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontSize: '28px',
            fontWeight: '400',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-instrument), sans-serif',
              fontWeight: '400', // Regular weight for "Style"
              color: '#2D2D2D',
            }}>Style</span>
            <span style={{
              fontFamily: 'var(--font-instrument), sans-serif',
              fontWeight: '500', // Medium weight for "Luxe"
              background: 'linear-gradient(135deg, #FF6B6B, #E07856)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Luxe</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flexGrow: 1,
            justifyContent: 'flex-end',
          }} className="hidden md:flex">
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

            {/* Categories Dropdown */}
            <div 
              style={{ position: 'relative' }} 
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
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
                  {categories.map((category) => (
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

          {/* Mobile Menu Icon */}
          <button style={{
            display: 'none',
            fontSize: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
          }} className="block md:hidden">
            ☰
          </button>
        </div>
      </div>
    </header>
  )
}

