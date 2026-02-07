/**
 * Pick the best category for a product from our fixed list (for semi-auto pipeline).
 */

import Anthropic from '@anthropic-ai/sdk'
import { slugToCategory } from './category-metadata'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CATEGORY_NAMES = Object.values(slugToCategory) // Skincare, Makeup, Hair Care, etc.

export async function pickProductCategory(
  productName: string,
  brand?: string | null,
  descriptionOrFeatures?: string | null
): Promise<string> {
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  const prompt = `Choose exactly ONE category for this beauty product. Reply with ONLY the category name, nothing else.

Product name: ${productName}
${brand ? `Brand: ${brand}` : ''}
${descriptionOrFeatures ? `Details: ${String(descriptionOrFeatures).substring(0, 400)}` : ''}

Allowed categories (reply with one of these exactly): ${CATEGORY_NAMES.join(', ')}

Examples: face serum → Skincare, lipstick → Makeup, shampoo → Hair Care, body lotion → Body Care, perfume → Fragrance, brush set → Tools & Accessories, beard oil → Men's Grooming. If unsure, prefer Skincare for Korean/Asian beauty products.`

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]
    if (text.type !== 'text') return 'Skincare'
    const raw = text.text.trim()
    const match = CATEGORY_NAMES.find((c) => raw === c || raw.toLowerCase().includes(c.toLowerCase()))
    return match || 'Skincare'
  } catch (error) {
    console.error('pickProductCategory failed:', error)
    return 'Skincare'
  }
}
