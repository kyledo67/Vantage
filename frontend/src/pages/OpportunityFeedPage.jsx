import { useState } from 'react'
import { useOpportunities } from '../hooks/useOpportunities.js'
import OpportunityFilters from '../components/opportunities/OpportunityFilters.jsx'
import OpportunityCard from '../components/opportunities/OpportunityCard.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorState from '../components/common/ErrorState.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

export default function OpportunityFeedPage() {
  const [filters, setFilters] = useState({})
  const { data, status, error, refetch } = useOpportunities(filters)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-vantage-text">EV Finder</h1>
        <p className="text-sm text-vantage-textDim">
          Kalshi and Polymarket sports contracts estimated to be priced below their market
          value, updated continuously.
        </p>
      </div>

      <OpportunityFilters filters={filters} onChange={setFilters} />

      {status === 'loading' && <LoadingSpinner label="Loading opportunities…" />}
      {status === 'error' && (
        <ErrorState message={error?.message || 'Could not load opportunities.'} onRetry={refetch} />
      )}
      {status === 'success' && data.length === 0 && (
        <EmptyState
          title="No opportunities match these filters"
          description="Try widening the sport, platform, or minimum ROI filters."
        />
      )}
      {status === 'success' && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </div>
  )
}
