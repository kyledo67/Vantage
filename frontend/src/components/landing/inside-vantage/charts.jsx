import { useMemo, useState } from 'react'

// Small, dependency-free SVG charts for the landing page's "Inside Vantage"
// preview — same hand-rolled approach as the rest of the app's charts
// (no charting library), scoped to this section's sample data.

const WIDTH = 320

/** Two-line offered-vs-sharp price chart with a purple-to-green advantage fill. */
export function LineMovementChart({ series, height = 90 }) {
  const { offeredPath, sharpPath, fillPath } = useMemo(() => {
    const values = series.flatMap((p) => [p.offered, p.sharp])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pad = 10
    const stepX = WIDTH / (series.length - 1)
    const toXY = (i, v) => [i * stepX, height - pad - ((v - min) / range) * (height - pad * 2)]

    const offered = series.map((p, i) => toXY(i, p.offered))
    const sharp = series.map((p, i) => toXY(i, p.sharp))
    const path = (points) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

    return {
      offeredPath: path(offered),
      sharpPath: path(sharp),
      fillPath: `${path(offered)} L${sharp.map(([x, y]) => `${x},${y}`).reverse().join(' L')} Z`,
    }
  }, [series, height])

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="inside-vantage-advantage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CE63E9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#63D6A5" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#inside-vantage-advantage)" stroke="none" />
      <path d={offeredPath} fill="none" stroke="#DF78FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={sharpPath} fill="none" stroke="#63D6A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Single-line trend chart with a hover tooltip, used for the CLV preview. */
export function TrendChart({ series, height = 100 }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const { path, areaPath, dots } = useMemo(() => {
    const values = series.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pad = 10
    const stepX = series.length > 1 ? WIDTH / (series.length - 1) : 0
    const coords = series.map((p, i) => [i * stepX, height - pad - ((p.value - min) / range) * (height - pad * 2)])
    const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    return {
      path: linePath,
      areaPath: `${linePath} L${WIDTH},${height} L0,${height} Z`,
      dots: coords,
    }
  }, [series, height])

  function handleMove(e) {
    if (series.length < 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const stepX = WIDTH / (series.length - 1)
    setHoverIndex(Math.min(series.length - 1, Math.max(0, Math.round(relX / stepX))))
  }

  const hovered = hoverIndex !== null ? series[hoverIndex] : null

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
        <path d={areaPath} fill="#63D6A5" opacity="0.1" stroke="none" />
        <path d={path} fill="none" stroke="#63D6A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hovered && (
          <circle cx={dots[hoverIndex][0]} cy={dots[hoverIndex][1]} r="3.5" fill="#CE63E9" stroke="#09090D" strokeWidth="1.5" />
        )}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute -top-1 left-0 rounded-lg border border-vantage-border bg-vantage-surface px-2.5 py-1.5 text-xs text-vantage-positive shadow-[0_12px_30px_-14px_rgba(0,0,0,0.85)]">
          +{hovered.value.toFixed(1)}% CLV
        </div>
      )}
    </div>
  )
}
