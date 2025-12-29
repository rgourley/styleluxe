'use client'

interface SparklineProps {
  data: number[] // Array of scores (0-100)
  width?: number
  height?: number
  color?: string
}

/**
 * Simple sparkline component - small line chart showing trend over time
 * Shows last 7 days of trend score data
 */
export default function Sparkline({ 
  data, 
  width = 60, 
  height = 20,
  color = '#E07856' 
}: SparklineProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Normalize data to fit in the chart area (with padding)
  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1 // Avoid division by zero
  
  // Generate path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return `${x},${y}`
  })

  const pathData = `M ${points.join(' L ')}`
  
  // Get the last point (most recent value) for the dot
  const lastPoint = points[points.length - 1]
  const [lastX, lastY] = lastPoint.split(',').map(Number)

  return (
    <svg 
      width={width} 
      height={height} 
      style={{ display: 'block' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small dot at the end (most recent value) */}
      <circle
        cx={lastX}
        cy={lastY}
        r="1.5"
        fill={color}
      />
    </svg>
  )
}

