// Small, dependency-free visualizations for the Home dashboard — hand-rolled
// SVG rather than pulling in a charting library for two shapes.

/**
 * Circular progress ring. Renders a neutral empty ring with a center dash
 * when there's no data yet, rather than a fabricated 0%-filled circle.
 */
export function ProgressRing({ value, label, size = 128, stroke = 10 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const hasValue = typeof value === 'number' && Number.isFinite(value)
  const clamped = hasValue ? Math.min(1, Math.max(0, value)) : 0
  const offset = circumference * (1 - clamped)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-vantage-border"
        />
        {hasValue && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-vantage-accent transition-[stroke-dashoffset] duration-500 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        <span className="text-lg font-semibold text-vantage-text">
          {hasValue ? `${Math.round(clamped * 100)}%` : '—'}
        </span>
        {label && <span className="text-xs text-vantage-textDim">{label}</span>}
      </div>
    </div>
  )
}

/**
 * Filled line/area sparkline. A flat zero-line renders as a thin centered
 * dash rather than stretching a meaningless flat area across the full box.
 */
export function Sparkline({ series, positive = true, height = 88 }) {
  const values = (series ?? []).map((point) => point.value)
  const hasSignal = values.some((v) => v !== 0)

  if (!series || series.length < 2 || !hasSignal) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-vantage-border text-xs text-vantage-textDim"
        style={{ height }}
      >
        No settled bets in this period yet
      </div>
    )
  }

  const width = 320
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 12) - 6
    return [x, y]
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  const colorClass = positive ? 'text-vantage-positive' : 'text-vantage-danger'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${colorClass}`}
      style={{ height }}
      aria-hidden="true"
    >
      <path d={areaPath} fill="currentColor" opacity="0.12" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** Single beating/even/missing row: label, share of bets, and a fill bar. */
export function BreakdownRow({ label, pct, colorClass }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${colorClass}`} aria-hidden="true" />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-vantage-border">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-16 flex-shrink-0 text-right text-xs text-vantage-textDim">
        {pct.toFixed(1)}%
      </span>
      <span className="w-14 flex-shrink-0 text-xs text-vantage-textDim">{label}</span>
    </div>
  )
}
