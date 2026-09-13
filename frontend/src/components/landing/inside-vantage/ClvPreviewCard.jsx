import { useState } from 'react'
import { TrendChart } from './charts.jsx'
import { CLV_RANGES, getClvPreview } from './data.js'

function formatOdds(odds) {
  return odds > 0 ? `+${odds}` : `${odds}`
}

/**
 * Compact CLV preview — average CLV, bet-time vs. closing odds, a short
 * trend chart, percentage beating the close, and time-range tabs. Sample
 * data only, swapped locally when a range is picked (no network round trip
 * on a marketing page).
 */
export default function ClvPreviewCard() {
  const [range, setRange] = useState('30d')
  const clv = getClvPreview(range)

  return (
    <div className="rounded-2xl border border-vantage-border bg-gradient-to-b from-vantage-surface to-vantage-surfaceAlt p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-vantage-textDim">Closing Line Value</p>
          <p className="mt-1 text-3xl font-semibold text-vantage-positive">+{clv.avgClvPct}%</p>
          <p className="text-xs text-vantage-textDim">average CLV</p>
        </div>
        <div className="flex gap-1 rounded-full border border-vantage-border bg-vantage-surface p-1">
          {CLV_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`min-h-[32px] rounded-full px-3 text-xs font-medium transition-colors ${
                range === r.id ? 'bg-vantage-raised text-vantage-alert' : 'text-vantage-textDim hover:text-vantage-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <TrendChart series={clv.series} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-vantage-border/60 pt-5">
        <div>
          <p className="text-xs text-vantage-textDim">Bet-time odds vs. close</p>
          <p className="mt-1 text-base font-medium text-vantage-text">
            {formatOdds(clv.betOdds)} <span className="text-vantage-textDim">→</span>{' '}
            <span className="text-vantage-positive">{formatOdds(clv.closingOdds)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-vantage-textDim">Beating the close</p>
          <p className="mt-1 text-base font-medium text-vantage-text">{clv.pctBeatingClose}% of bets</p>
        </div>
      </div>
    </div>
  )
}
