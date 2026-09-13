import { useMemo, useState } from 'react'

const WIDTH = 320

function relativeTime(iso) {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.round(diffH / 24)}d ago`
}

/**
 * EV-over-time chart for a single watched opportunity. Every point is a
 * genuinely observed reading (see EvWatchlistContext.recordObservation) —
 * captured the moment the app actually fetched that value — never a
 * generated or interpolated series. With fewer than two distinct readings
 * yet, it says so rather than drawing a fake trend line.
 */
export default function OddsHistoryChart({ points, height = 84 }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const { path, dots, min, max } = useMemo(() => {
    if (!points || points.length < 2) return { path: '', dots: [], min: 0, max: 0 }
    const values = points.map((p) => p.evValue)
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const range = hi - lo || 1
    const padY = 10
    const stepX = WIDTH / (points.length - 1)
    const coords = points.map((p, i) => [
      i * stepX,
      height - padY - ((p.evValue - lo) / range) * (height - padY * 2),
    ])
    return {
      path: coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      dots: coords,
      min: lo,
      max: hi,
    }
  }, [points, height])

  if (!points || points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-vantage-border text-xs text-vantage-textDim"
        style={{ height }}
      >
        Collecting odds history since it was watched…
      </div>
    )
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const positive = points[points.length - 1].evValue >= points[0].evValue

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const stepX = WIDTH / (points.length - 1)
    setHoverIndex(Math.min(points.length - 1, Math.max(0, Math.round(relX / stepX))))
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="w-full touch-none"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <path
          d={path}
          fill="none"
          stroke={positive ? '#63D6A5' : '#E0616B'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Live pulsing dot on the most recent reading. */}
        <circle
          cx={dots[dots.length - 1][0]}
          cy={dots[dots.length - 1][1]}
          r="3.5"
          fill={positive ? '#63D6A5' : '#E0616B'}
        />
        {hovered && (
          <>
            <line
              x1={dots[hoverIndex][0]}
              x2={dots[hoverIndex][0]}
              y1="0"
              y2={height}
              stroke="#312E3C"
              strokeWidth="1"
            />
            <circle cx={dots[hoverIndex][0]} cy={dots[hoverIndex][1]} r="3.5" fill="#CE63E9" stroke="#09090D" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {hovered ? (
        <div className="pointer-events-none absolute -top-1 left-0 rounded-lg border border-vantage-border bg-vantage-surface px-2.5 py-1.5 text-xs shadow-[0_12px_30px_-14px_rgba(0,0,0,0.85)]">
          <p className="font-medium text-vantage-text">{hovered.priceLabel ?? `EV ${hovered.evValue.toFixed(1)}%`}</p>
          <p className="text-vantage-textDim">{relativeTime(hovered.t)}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-0 top-0 text-xs text-vantage-textDim">
          {min.toFixed(1)}–{max.toFixed(1)}% EV range
        </div>
      )}
    </div>
  )
}
