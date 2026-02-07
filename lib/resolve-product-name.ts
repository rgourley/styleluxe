/**
 * Resolve product display name: prefer PDP title, use Claude if it's still spammy.
 * Run this at the start of the pipeline so the rest of the flow uses a clean name.
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/** Heuristic: PDP title is likely spammy/keyword-stuffed */
export function isPdpTitleSpammy(pdpTitle: string): boolean {
  if (!pdpTitle || pdpTitle.length < 10) return false
  const t = pdpTitle.toLowerCase()
  // Very long titles are often keyword-stuffed
  if (pdpTitle.length > 90) return true
  // Common spam patterns
  const spamPatterns = [
    /\b(pack of \d+|set of \d+|\d+\s*piece)\b/i,
    /\b(for (men|women|all skin types)|men and women)\b/i,
    /\b(with \w+ (and|&) \w+)\b/i,
    /\b(\d+(\s*oz|\s*ml|\s*fl\s*oz))\b.*\b(\d+(\s*oz|\s*ml|\s*fl\s*oz))\b/i, // multiple sizes in title
    /\b(anti-aging|anti aging|wrinkle|firming|hydrating|moisturizing|repair|renewal)\b.*\b(anti-aging|anti aging|wrinkle|firming|hydrating|moisturizing|repair|renewal)\b/i, // repeated benefit keywords
    /\b\d+\s*%\s*\w+/i, // "50% vitamin C" style
    /\b(best seller|bestseller|amazon's choice|prime)\b/i,
  ]
  return spamPatterns.some((p) => p.test(pdpTitle))
}

/**
 * Resolve the best display name: use PDP title if clean, else ask Claude for
 * a short "Brand + Product" style name.
 */
export async function resolveProductName(
  listingTitle: string,
  pdpTitle: string,
  brand?: string | null
): Promise<string> {
  const cleanPdp = pdpTitle?.trim() || listingTitle?.trim()
  if (!cleanPdp) return listingTitle?.trim() || 'Unknown Product'

  if (!isPdpTitleSpammy(cleanPdp)) {
    return cleanPdp.substring(0, 200)
  }

  // PDP title is spammy — use Claude to produce a short, brand + product-style name
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  const prompt = `You are helping clean up product names for a beauty/skincare site. Amazon listing titles are often long and keyword-stuffed. Produce ONE short, readable product name in the form "Brand + Product Name" (e.g. "COSRX Snail Mucin Essence" or "CeraVe Moisturizing Cream").

Listing title (from Movers & Shakers): ${listingTitle.substring(0, 300)}
PDP title (from product page): ${pdpTitle.substring(0, 300)}
${brand ? `Brand: ${brand}` : ''}

Rules:
- Output ONLY the cleaned product name, nothing else. No quotes, no explanation.
- Prefer the brand + main product type (e.g. serum, moisturizer, cleanser). Drop filler like "pack of 2", "for men and women", long ingredient lists, or repeated benefit keywords.
- Keep it under 80 characters.
- If the PDP title is already acceptable (short, clear), you may return it trimmed; otherwise shorten to brand + product name.`

  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]
    if (text.type !== 'text') return cleanPdp.substring(0, 200)
    const name = text.text.trim().replace(/^["']|["']$/g, '').substring(0, 200)
    return name || cleanPdp.substring(0, 200)
  } catch (error) {
    console.error('resolveProductName Claude call failed:', error)
    return cleanPdp.substring(0, 200)
  }
}
