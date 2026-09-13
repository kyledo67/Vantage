import { LineMovementChart } from './charts.jsx'
import { previewOpportunity as o } from './data.js'

function formatOdds(odds) {
  return odds > 0 ? `+${odds}` : `${odds}`
}

const SOURCE_STYLE = {
  offered: 'border-vantage-border text-vantage-textDim',
  exchange: 'border-vantage-accent/40 text-vantage-alert',
  sharp: 'border-vantage-positive/40 text-vantage-positive',
  fair: 'border-vantage-positive/40 text-vantage-positive',
}

/**
 * The "compelling snippet" — a realistic, sample-only Positive EV card
 * showing offered price vs. Kalshi/Polymarket/Pinnacle/consensus, the
 * probability edge, estimated EV, confidence, suggested Kelly stake, and a
 * compact line-movement chart. Mirrors the shape of the real EV Finder /
 * Watchlist detail views, but every number here is illustrative.
 */
export default function OddsPreviewCard() {
  return (
    <div className="rounded-2xl border border-vantage-border bg-vantage-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-vantage-textDim">{o.event}</p>
          <h3 className="mt-1 text-xl font-semibold text-vantage-text sm:text-2xl">
            {o.selection.title} <span className="text-vantage-textDim">— {o.selection.subtitle}</span>
          </h3>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-vantage-positive/15 px-3 py-1.5 text-sm font-medium text-vantage-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          Confidence: {o.confidence}
        </span>
      </div>

      {/* Source-by-source pricing */}
      <div className="mt-6 flex flex-wrap gap-2">
        {o.sources.map((s) => (
          <span
            key={s.name}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${SOURCE_STYLE[s.type]}`}
          >
            {s.name}
            <span className="text-vantage-text">{formatOdds(s.odds)}</span>
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-vantage-textDim">Implied prob.</p>
          <p className="mt-1 text-lg font-semibold text-vantage-text">{o.impliedProb}%</p>
        </div>
        <div>
          <p className="text-xs text-vantage-textDim">Fair prob.</p>
          <p className="mt-1 text-lg font-semibold text-vantage-text">{o.fairProb}%</p>
        </div>
        <div>
          <p className="text-xs text-vantage-textDim">Edge</p>
          <p className="mt-1 text-lg font-semibold text-vantage-positive">+{o.edgePct}pp</p>
        </div>
        <div>
          <p className="text-xs text-vantage-textDim">Est. EV after fees</p>
          <p className="mt-1 text-lg font-semibold text-vantage-positive">+{o.estEvPct}%</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-vantage-raised px-5 py-4">
        <div>
          <p className="text-xs text-vantage-textDim">Suggested stake ({o.kelly.fraction})</p>
          <p className="mt-1 text-base font-semibold text-vantage-text">
            {o.kelly.stakePct}% of bankroll <span className="text-vantage-textDim">· ${o.kelly.stakeDollar} example</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs text-vantage-textDim">
          <span>Offered vs. sharp price — last 6h</span>
          <span className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vantage-alert" aria-hidden="true" />
              FanDuel
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vantage-positive" aria-hidden="true" />
              Pinnacle
            </span>
          </span>
        </div>
        <LineMovementChart series={o.priceHistory} />
      </div>
    </div>
  )
}
