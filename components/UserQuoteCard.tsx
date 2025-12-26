'use client'

import { useState } from 'react'

interface UserQuoteCardProps {
  quoteText: string
  attribution?: string
}

interface ParsedAttribution {
  isVerified: boolean
  skinType?: string
  timeline?: string
}

function parseAttribution(attribution?: string): ParsedAttribution {
  if (!attribution) {
    return { isVerified: false }
  }

  const lower = attribution.toLowerCase()
  
  // Check for verified (any mention of verified)
  const isVerified = lower.includes('verified')
  
  // Split by commas to get individual parts
  const parts = attribution.split(',').map(p => p.trim())
  
  let skinType: string | undefined
  let timeline: string | undefined
  
  // Skin type keywords to look for
  const skinTypeMap: Record<string, string> = {
    'acne-prone': 'Acne-Prone Skin',
    'acne prone': 'Acne-Prone Skin',
    'combination': 'Combination Skin',
    'dry': 'Dry Skin',
    'sensitive': 'Sensitive Skin',
    'oily': 'Oily Skin',
    'mature': 'Mature Skin',
    'normal': 'Normal Skin',
  }
  
  // Timeline keywords to look for
  const timelineKeywords = [
    'user', 'using', 'after', 'for', 'week', 'month', 'year', 'day',
    'long-term', 'regular', 'daily'
  ]
  
  // Process each part
  for (const part of parts) {
    const partLower = part.toLowerCase()
    
    // Skip "verified buyer" or "verified purchase" - already handled
    if (partLower.includes('verified')) {
      continue
    }
    
    // Check if this part contains a skin type
    if (!skinType) {
      for (const [keyword, display] of Object.entries(skinTypeMap)) {
        if (partLower.includes(keyword)) {
          skinType = display
          break
        }
      }
    }
    
    // Check if this part contains timeline info (numbers + time words, or specific user types)
    if (!timeline) {
      const hasTimeKeyword = timelineKeywords.some(kw => partLower.includes(kw))
      const hasNumber = /\d+/.test(partLower)
      
      if (hasTimeKeyword && (hasNumber || partLower.includes('long-term') || partLower.includes('regular') || partLower.includes('daily'))) {
        timeline = part
      }
    }
  }
  
  return { isVerified, skinType, timeline }
}

export default function UserQuoteCard({ quoteText, attribution }: UserQuoteCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const parsed = parseAttribution(attribution)
  
  // Build user info line (e.g., "✓ Verified buyer • Acne-Prone Skin")
  const userInfoParts: string[] = []
  if (parsed.isVerified) {
    userInfoParts.push('✓ Verified buyer')
  }
  if (parsed.skinType) {
    userInfoParts.push(parsed.skinType)
  }
  const userInfoText = userInfoParts.join(' • ')
  
  return (
    <div
      suppressHydrationWarning
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0F0F0',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '20px',
        boxShadow: isHovered ? '0 4px 16px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quote Text */}
      <div 
        suppressHydrationWarning
        style={{
          fontSize: '18px',
          lineHeight: '1.7',
          color: '#2D2D2D',
          fontStyle: 'italic',
          marginBottom: '20px',
        }}>
        "{quoteText}"
      </div>
      
      {/* Footer with Avatar and Attribution */}
      <div 
        suppressHydrationWarning
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
        {/* Avatar Icon */}
        <div 
          suppressHydrationWarning
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#E7E7E7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
          <img 
            src="/images/297566.svg" 
            alt="User avatar"
            style={{
              width: '24px',
              height: '24px',
              opacity: 0.6,
            }}
          />
        </div>
        
        {/* Attribution Text */}
        <div suppressHydrationWarning style={{ flex: 1 }}>
          {/* User Info (Verified buyer • Skin Type) */}
          {userInfoText && (
            <div 
              suppressHydrationWarning
              style={{
                fontSize: '14px',
                color: '#6b6b6b',
                lineHeight: '1.5',
              }}>
              {parsed.isVerified && (
                <span suppressHydrationWarning style={{ color: '#2A7C7C', fontWeight: '600' }}>✓ Verified buyer</span>
              )}
              {parsed.isVerified && parsed.skinType && (
                <span suppressHydrationWarning> • </span>
              )}
              {parsed.skinType && (
                <span suppressHydrationWarning>{parsed.skinType}</span>
              )}
            </div>
          )}
          
          {/* Timeline */}
          {parsed.timeline && (
            <div 
              suppressHydrationWarning
              style={{
                fontSize: '13px',
                color: '#8b8b8b',
                marginTop: '4px',
                lineHeight: '1.5',
              }}>
              {parsed.timeline}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

