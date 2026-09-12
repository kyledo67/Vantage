import { useMemo, useRef, useState } from 'react'

/**
 * Backend-provided price history.
 *
 * One series only (purple #CE63E9, the brand chart colour). Consensus is drawn
 * as a dashed neutral *annotation*, not a second categorical series — a second
 * purple-family series fails CVD separation, and green is reserved for status,
 * so a true two-series categorical palette isn't available here. A single
 * series needs no legend; the dashed line carries its own direct label.
 */
export default function PriceHistoryChart({ history, height = 180 }) {
  const points = history?.points ?? []
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const geometry = useMemo(() => {
    if (points.length < 2) return null
    const values = points.map((p) => Number(p.value)).filter((v) => Number.isFinite(v))
    if (values.length < 2) return null

    const consensus = Number(history?.consensus)
    const pool = Number.isFinite(consensus) ? [...values, consensus] : values
    const rawMin = Math.min(...pool)
    const rawMax = Math.max(...pool)
    // Pad so the line never sits flat against an edge.
    const pad = (rawMax - rawMin || 1) * 0.15
    const min = rawMin - pad
    const max = rawMax + pad

    const x = (i) => (i / (points.length - 1)) * 100
    const y = (v) => 100 - ((v - min) / (max - min)) * 100

    return {
      min,
      max,
      x,
      y,
      path: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(Number(p.value))}`).join(' '),
      consensusY: Number.isFinite(consensus) ? y(consensus) : null,
      consensus,
    }
  }, [points, history?.consensus])

  if (!geometry) return null

  const suffix = history?.valueSuffix ?? ''
  const last = points[points.length - 1]

  function handleMove(e) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (points.length - 1)))
  }

  const hovered = hover != null ? points[hover] : null

  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wide text-vantage-alert">Price history</span>
        {last?.value != null && (
          <span className="text-sm font-semibold text-vantage-text">
            {last.value}
            {suffix}
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Price history over time"
        style={{ height }}
        className="w-full touch-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Recessive gridlines */}
        {[0, 25, 50, 75, 100].map((g) => (
          <line
            key={g}
            x1="0"
            x2="100"
            y1={g}
            y2={g}
            stroke="#312E3C"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Consensus annotation — dashed, neutral ink, not a series */}
        {geometry.consensusY != null && (
          <line
            x1="0"
            x2="100"
            y1={geometry.consensusY}
            y2={geometry.consensusY}
            stroke="#AAA1B4"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        <path
          d={geometry.path}
          fill="none"
          stroke="#CE63E9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover != null && Number.isFinite(Number(points[hover]?.value)) && (
          <>
            <line
              x1={geometry.x(hover)}
              x2={geometry.x(hover)}
              y1="0"
              y2="100"
              stroke="#484451"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={geometry.x(hover)}
              cy={geometry.y(Number(points[hover].value))}
              r="4"
              fill="#CE63E9"
              stroke="#15141D"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] text-vantage-textDim">
        {geometry.consensus != null && Number.isFinite(geometry.consensus) && (
          <span>
            <span className="mr-1 inline-block h-px w-3 border-t border-dashed border-vantage-textDim align-middle" />
            Consensus {geometry.consensus}
            {suffix}
          </span>
        )}
        {hovered && (
          <span className="text-vantage-text">
            {hovered.value}
            {suffix}
            {hovered.t && ` · ${new Date(hovered.t).toLocaleString()}`}
          </span>
        )}
      </div>

      {/* Accessible equivalent of the plotted data */}
      <table className="sr-only">
        <caption>Price history</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.t ?? i}>
              <td>{p.t ? new Date(p.t).toLocaleString() : i + 1}</td>
              <td>
                {p.value}
                {suffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
