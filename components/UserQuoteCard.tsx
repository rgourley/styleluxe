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
  
  // Check for verified
  const isVerified = lower.includes('verified buyer') || lower.includes('verified purchase') || lower.includes('verified')
  
  // Extract skin type - more comprehensive patterns
  let skinType: string | undefined
  const skinTypes = [
    { match: 'acne-prone', display: 'Acne-Prone Skin' },
    { match: 'combination', display: 'Combination Skin' },
    { match: 'dry skin', display: 'Dry Skin' },
    { match: 'sensitive', display: 'Sensitive Skin' },
    { match: 'oily', display: 'Oily Skin' },
    { match: 'mature skin', display: 'Mature Skin' },
    { match: 'normal skin', display: 'Normal Skin' },
  ]
  
  for (const type of skinTypes) {
    if (lower.includes(type.match)) {
      skinType = type.display
      break
    }
  }
  
  // Extract timeline - more comprehensive patterns
  let timeline: string | undefined
  const timelinePatterns = [
    /\d+\s*(?:year|yr)s?/i,
    /\d+\s*(?:month|mo)s?/i,
    /\d+\s*(?:week|wk)s?/i,
    /\d+\s*(?:day|d)s?/i,
    /\d+-(?:month|week|day|year)\s+user/i,
    /long-term\s+user/i,
    /regular\s+user/i,
    /using\s+for\s+[\w\s]+/i,
  ]
  
  for (const pattern of timelinePatterns) {
    const match = attribution.match(pattern)
    if (match) {
      timeline = match[0]
      break
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
            color: '#6b6b6b',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          👤
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

