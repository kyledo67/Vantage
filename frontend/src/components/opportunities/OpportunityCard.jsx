import { Link } from 'react-router-dom'
import ConfidenceBadge from './ConfidenceBadge.jsx'
import PriceAdvantageTag from './PriceAdvantageTag.jsx'
import FreshnessIndicator from './FreshnessIndicator.jsx'
import { formatCents } from '../../utils/format.js'

export default function OpportunityCard({ opportunity }) {
  const {
    id,
    platform,
    event,
    title,
    executablePriceDecimal,
    fairProbability,
    priceAdvantageDecimal,
    estimatedRoi,
    confidence,
    contributingBooks,
    quoteUpdatedAt,
  } = opportunity

  return (
    <Link
      to={`/ev-finder/${id}`}
      className="block rounded-lg border border-vantage-border bg-vantage-surface p-6 transition-colors hover:border-vantage-accent/50"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2.5 text-sm uppercase tracking-wide text-vantage-textDim">
            <span className="rounded bg-vantage-border px-2 py-0.5">{platform}</span>
            <span>{event}</span>
          </div>
          <h3 className="text-base font-semibold text-vantage-text sm:text-lg">{title}</h3>
        </div>
        <PriceAdvantageTag priceAdvantageDecimal={priceAdvantageDecimal} estimatedRoi={estimatedRoi} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-vantage-textDim">
        <span>
          Market price:{' '}
          <span className="font-medium text-vantage-text">{formatCents(executablePriceDecimal)}</span>
        </span>
        <span>
          Estimated market value:{' '}
          <span className="font-medium text-vantage-text">{formatCents(fairProbability)}</span>
        </span>
        <span>Based on: {contributingBooks.join(', ')}</span>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <ConfidenceBadge level={confidence} />
        <FreshnessIndicator updatedAt={quoteUpdatedAt} />
      </div>
    </Link>
  )
}
