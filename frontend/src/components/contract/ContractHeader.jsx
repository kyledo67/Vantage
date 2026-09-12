import ConfidenceBadge from '../opportunities/ConfidenceBadge.jsx'
import FreshnessIndicator from '../opportunities/FreshnessIndicator.jsx'

export default function ContractHeader({ opportunity }) {
  return (
    <div className="border-b border-vantage-border pb-4">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-vantage-textDim">
        <span className="rounded bg-vantage-border px-1.5 py-0.5">{opportunity.platform}</span>
        <span>{opportunity.event}</span>
      </div>
      <h1 className="text-xl font-semibold text-vantage-text sm:text-2xl">{opportunity.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-vantage-textDim">
        {opportunity.resolutionCriteria}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <ConfidenceBadge level={opportunity.confidence} />
        <FreshnessIndicator updatedAt={opportunity.quoteUpdatedAt} />
      </div>
    </div>
  )
}
