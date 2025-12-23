'use client'

import { useRouter } from 'next/navigation'

const categories = [
  { id: 'all', label: 'All Products' },
  { id: 'skincare', label: 'Skincare' },
  { id: 'makeup', label: 'Makeup' },
  { id: 'hair', label: 'Hair Care' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'fragrance', label: 'Fragrance' },
]

interface CategoryFilterProps {
  selectedCategory?: string
  searchQuery?: string
}

export default function CategoryFilter({ selectedCategory = 'all', searchQuery = '' }: CategoryFilterProps) {
  const router = useRouter()

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams()
    
    if (categoryId !== 'all') {
      params.set('category', categoryId)
    }
    
    // Preserve search query if exists
    if (searchQuery) {
      params.set('q', searchQuery)
    }
    
    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => handleCategoryChange(category.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            selectedCategory === category.id
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}

