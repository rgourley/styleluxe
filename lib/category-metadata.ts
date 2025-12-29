// Category metadata for SEO and page titles
export interface CategoryMetadata {
  slug: string
  title: string
  description: string
  subhead: string
  seoTitle: string
  seoDescription: string
}

export const categoryMetadata: Record<string, CategoryMetadata> = {
  'skincare': {
    slug: 'skincare',
    title: 'Trending Skincare Products',
    description: 'Discover the hottest skincare products trending right now on TikTok, Instagram, Reddit, and Amazon.',
    subhead: 'From viral serums to breakout cleansers, find the skincare products everyone is talking about.',
    seoTitle: 'Trending Skincare Products - What\'s Going Viral Right Now',
    seoDescription: 'Discover the hottest trending skincare products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find serums, cleansers, moisturizers, and more that are going viral.',
  },
  'makeup': {
    slug: 'makeup',
    title: 'Trending Makeup Products',
    description: 'Find the makeup products that are trending right now - from viral lipsticks to must-have foundations.',
    subhead: 'Discover the makeup products everyone is raving about on social media and beauty communities.',
    seoTitle: 'Trending Makeup Products - Viral Beauty Finds',
    seoDescription: 'Discover the hottest trending makeup products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find lipsticks, foundations, eyeshadows, and more that are going viral.',
  },
  'hair-care': {
    slug: 'hair-care',
    title: 'Trending Hair Care Products',
    description: 'Explore the hair care products that are trending right now - from viral shampoos to game-changing treatments.',
    subhead: 'Find the hair care products everyone is talking about and adding to their routines.',
    seoTitle: 'Trending Hair Care Products - Viral Hair Finds',
    seoDescription: 'Discover the hottest trending hair care products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find shampoos, conditioners, treatments, and more that are going viral.',
  },
  'body-care': {
    slug: 'body-care',
    title: 'Trending Body Care Products',
    description: 'Discover the body care products that are trending right now - from viral lotions to must-have scrubs.',
    subhead: 'Find the body care products everyone is loving and recommending.',
    seoTitle: 'Trending Body Care Products - Viral Body Care Finds',
    seoDescription: 'Discover the hottest trending body care products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find lotions, scrubs, body washes, and more that are going viral.',
  },
  'fragrance': {
    slug: 'fragrance',
    title: 'Trending Fragrance Products',
    description: 'Explore the fragrances that are trending right now - from viral perfumes to must-have scents.',
    subhead: 'Discover the fragrances everyone is talking about and adding to their collection.',
    seoTitle: 'Trending Fragrance Products - Viral Perfume Finds',
    seoDescription: 'Discover the hottest trending fragrance products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find perfumes, colognes, and scents that are going viral.',
  },
  'tools-accessories': {
    slug: 'tools-accessories',
    title: 'Trending Beauty Tools & Accessories',
    description: 'Find the beauty tools and accessories that are trending right now - from viral brushes to game-changing devices.',
    subhead: 'Discover the tools and accessories everyone is raving about.',
    seoTitle: 'Trending Beauty Tools & Accessories - Viral Beauty Tools',
    seoDescription: 'Discover the hottest trending beauty tools and accessories on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find brushes, devices, applicators, and more that are going viral.',
  },
  'mens-grooming': {
    slug: 'mens-grooming',
    title: 'Trending Men\'s Grooming Products',
    description: 'Explore the men\'s grooming products that are trending right now - from viral skincare to must-have essentials.',
    subhead: 'Find the men\'s grooming products everyone is talking about.',
    seoTitle: 'Trending Men\'s Grooming Products - Viral Grooming Finds',
    seoDescription: 'Discover the hottest trending men\'s grooming products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews. Find skincare, shaving products, and more that are going viral.',
  },
  'other': {
    slug: 'other',
    title: 'Trending Beauty Products',
    description: 'Discover beauty products that are trending right now across all categories.',
    subhead: 'Find the products everyone is talking about and adding to their routines.',
    seoTitle: 'Trending Beauty Products - Viral Beauty Finds',
    seoDescription: 'Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews.',
  },
}

// Map database category names to slugs
export const categoryToSlug: Record<string, string> = {
  'Skincare': 'skincare',
  'Makeup': 'makeup',
  'Hair Care': 'hair-care',
  'Body Care': 'body-care',
  'Fragrance': 'fragrance',
  'Tools & Accessories': 'tools-accessories',
  'Men\'s Grooming': 'mens-grooming',
  'Other': 'other',
  'beauty': 'other', // Default fallback
}

// Map slugs to database category names
export const slugToCategory: Record<string, string> = {
  'skincare': 'Skincare',
  'makeup': 'Makeup',
  'hair-care': 'Hair Care',
  'body-care': 'Body Care',
  'fragrance': 'Fragrance',
  'tools-accessories': 'Tools & Accessories',
  'mens-grooming': 'Men\'s Grooming',
  'other': 'Other',
}

export function getCategoryMetadata(categorySlug: string): CategoryMetadata | null {
  return categoryMetadata[categorySlug] || null
}

export function getCategorySlug(categoryName: string | null): string | null {
  if (!categoryName) return null
  return categoryToSlug[categoryName] || null
}

export function getCategoryName(categorySlug: string): string | null {
  return slugToCategory[categorySlug] || null
}



