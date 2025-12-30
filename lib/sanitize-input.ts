/**
 * Input sanitization utilities
 * Prevents XSS attacks by sanitizing user input
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * For simple text fields (names, titles, etc.)
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove HTML tags
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim()
    .slice(0, 10000) // Limit length
}

/**
 * Sanitize HTML content (for markdown/rich text)
 * For content that may contain HTML (like product descriptions)
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Basic HTML sanitization - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers (onclick, etc.)
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers (single quotes)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol (can be dangerous)
    .slice(0, 50000) // Limit length
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = input.trim().toLowerCase().slice(0, 255)
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format')
  }

  return sanitized
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeURL(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  const sanitized = input.trim().slice(0, 2048)
  
  try {
    const url = new URL(sanitized)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid URL protocol')
    }
    return sanitized
  } catch {
    throw new Error('Invalid URL format')
  }
}

