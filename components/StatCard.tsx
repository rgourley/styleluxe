'use client'

interface StatCardProps {
  number: string | number
  label: string
  backgroundColor: string
  numberColor?: string
  labelColor?: string
  isLink?: boolean
  href?: string
}

export default function StatCard({
  number,
  label,
  backgroundColor,
  numberColor = '#2D2D2D',
  labelColor = '#6b6b6b',
  isLink = false,
  href,
}: StatCardProps) {
  const handleClick = () => {
    if (isLink && href) {
      window.open(href, '_blank')
    }
  }

  // Special styling for Google Trends link card
  const isGoogleTrends = isLink && typeof number === 'string' && number.includes('View Trends')

  const cardStyle = {
    backgroundColor,
    borderRadius: '12px',
    padding: '24px',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'flex-start',
    cursor: isLink ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLink) {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLink) {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }
  }

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isGoogleTrends ? (
        <>
          {/* Google Trends special layout */}
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: numberColor,
            marginBottom: '8px',
            lineHeight: '1',
          }}>
            {number}
          </div>
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            color: labelColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {label}
          </div>
        </>
      ) : (
        <>
          {/* Standard card layout */}
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: numberColor,
            lineHeight: '1',
            marginBottom: '8px',
          }}>
            {number}
          </div>
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            color: labelColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {label}
          </div>
        </>
      )}
    </div>
  )
}

