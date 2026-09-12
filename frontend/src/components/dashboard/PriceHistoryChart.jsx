import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DURATION } from '../../motion/tokens.js'

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
  const pathRef = useRef(null)
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

  /*
   * Draw-in effect, driven by requestAnimationFrame rather than a CSS
   * transition/keyframe. Two approaches were tried and rejected first:
   *
   *  1. SVG `pathLength="1"` + a CSS @keyframes on stroke-dashoffset: the
   *     engine resolved the keyframe's unitless "1" as a literal 1px rather
   *     than "1 pathLength-unit", so the dash pattern didn't match the path's
   *     real geometry and part of the line rendered as a permanent gap.
   *  2. getTotalLength() + a CSS `transition`: this fixed #1's math, but the
   *     transition runs on the compositor thread, which isn't governed by
   *     the same clock as this effect's own timing assumptions — verified by
   *     a diagnostic reading a stuck/inconsistent dashoffset that didn't
   *     match what was actually painted.
   *
   * A rAF loop removes that ambiguity: the animation is plain, inspectable
   * JS on the main thread, with no separate compositor timeline to fall out
   * of sync with.
   *
   * The resting state — set only once dash values are computed below — is
   * skipped entirely if the effect can't run (no ref, reduced motion), in
   * which case the plain, undecorated <path> renders fully drawn by default.
   */
  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path || !geometry) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const length = path.getTotalLength()

    if (reduceMotion || !Number.isFinite(length) || length === 0) {
      path.style.strokeDasharray = 'none'
      path.style.strokeDashoffset = '0'
      return undefined
    }

    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const durationMs = DURATION.chart * 1000
    const easeOutCubic = (t) => 1 - (1 - t) ** 3
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / durationMs)
      path.style.strokeDashoffset = `${length * (1 - easeOutCubic(t))}`
      if (t < 1) frame = requestAnimationFrame(tick)
    })

    // rAF can legitimately stop being scheduled before the animation reaches
    // t=1 — a backgrounded tab, aggressive throttling, or (as measured while
    // building this) a constrained headless renderer that only delivers a
    // couple of frames. When that happens the loop above stalls just short of
    // "fully drawn," which is worse than not animating at all. This timer
    // doesn't care how many rAF frames actually ran — it unconditionally
    // finishes the job once the animation's duration has elapsed.
    const finish = setTimeout(() => {
      cancelAnimationFrame(frame)
      path.style.strokeDashoffset = '0'
    }, durationMs + 50)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(finish)
    }
    // Re-run only when the plotted geometry actually changes — never on hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry?.path])

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
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-sm uppercase tracking-wide text-vantage-alert">Price history</span>
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

        {/*
          Draw-in is handled by the useLayoutEffect above (see its comment) —
          this element carries no dash attributes itself.

          Deliberately NO vectorEffect="non-scaling-stroke" here, unlike the
          gridlines/consensus line/hover marker below. This chart's viewBox
          (100x100) is stretched non-uniformly onto its box (~3:1 wide:tall),
          and on a multi-segment CURVED path, non-scaling-stroke under that
          much anisotropy produced a broken stroke outline at the curve's
          extremum — a real gap in the line, confirmed by removing it and
          watching the gap disappear. The straight decorative lines don't hit
          this (no curvature to break), so they keep it for constant on-screen
          width. Re-adding it here reintroduces the broken line.
        */}
        <path
          key={geometry.path}
          ref={pathRef}
          d={geometry.path}
          fill="none"
          stroke="#CE63E9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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

      <div className="mt-1.5 flex items-center justify-between text-xs text-vantage-textDim">
        {geometry.consensus != null && Number.isFinite(geometry.consensus) && (
          <span>
            <span className="mr-1.5 inline-block h-px w-3 border-t border-dashed border-vantage-textDim align-middle" />
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
