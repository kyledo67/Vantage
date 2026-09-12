import { useCallback, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TabsAndFilters from '../components/dashboard/TabsAndFilters.jsx'
import OpportunitiesTable from '../components/dashboard/OpportunitiesTable.jsx'
import { Skeleton, StatusIndicator } from '../components/dashboard/atoms.jsx'
import { useAsync } from '../hooks/useAsync.js'
import {
  getFilterConfig,
  getOpportunities,
  getOpportunityDetail,
} from '../services/opportunities.js'

function formatUpdated(iso) {
  if (!iso) return null
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (Number.isNaN(seconds)) return null
  if (seconds < 60) return `updated ${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `updated ${minutes}m ago`
  return `updated ${Math.floor(minutes / 60)}h ago`
}

export default function EvFinderPage() {
  const { search } = useOutletContext()

  const [category, setCategory] = useState('')
  const [filterValues, setFilterValues] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const refreshRequested = useRef(false)

  const filterConfig = useAsync(getFilterConfig, [])

  // Query params are sent to the API — filtering happens server-side, never
  // against a locally held dataset.
  const query = useMemo(
    () => ({ category, search, ...filterValues }),
    [category, search, filterValues]
  )

  const loadFeed = useCallback(() => {
    const refresh = refreshRequested.current
    refreshRequested.current = false
    return getOpportunities({ ...query, refresh: refresh ? 'true' : undefined })
  }, [query])

  const feed = useAsync(loadFeed, [loadFeed])

  const detail = useAsync(
    () => (expandedId ? getOpportunityDetail(expandedId) : Promise.resolve(null)),
    [expandedId],
    { immediate: Boolean(expandedId) }
  )

  const handleToggle = useCallback((id) => {
    // Opening a row collapses whichever row was open before.
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  const handleSelect = useCallback((id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }, [])

  const handleFilterChange = useCallback((id, value) => {
    setFilterValues((current) => ({ ...current, [id]: value }))
  }, [])

  const handleRefresh = useCallback(() => {
    refreshRequested.current = true
    setExpandedId(null)
    feed.refetch()
  }, [feed.refetch])

  const live = feed.data?.live
  const rows = feed.data?.results ?? []
  const updatedLabel = formatUpdated(live?.updatedAt)

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-vantage-text sm:text-3xl">
            Opportunities
          </h1>
          <p className="mt-1 text-sm text-vantage-textDim">
            Market signals priced below broader consensus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live state renders only when the backend reports one. */}
          {feed.status === 'loading' || feed.status === 'idle' ? (
            <Skeleton className="h-3 w-40" />
          ) : (
            live && (
              <StatusIndicator
                status={{
                  label: [live.isLive ? 'Live' : 'Partial', updatedLabel]
                    .filter(Boolean)
                    .join(' · '),
                  isPositive: live.isLive === true,
                }}
              />
            )
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={feed.status === 'loading'}
            className="rounded-full border border-vantage-border px-4 py-1.5 text-xs font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent disabled:cursor-wait disabled:opacity-50"
          >
            {feed.status === 'loading' ? 'Refreshing…' : 'Refresh odds'}
          </button>
        </div>
      </header>

      <TabsAndFilters
        config={filterConfig.data}
        status={filterConfig.status}
        activeCategory={category}
        onCategoryChange={setCategory}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />

      <OpportunitiesTable
        status={feed.status}
        rows={rows}
        error={feed.error}
        onRetry={handleRefresh}
        expandedId={expandedId}
        onToggle={handleToggle}
        detail={detail.data}
        detailStatus={detail.status}
        selectedIds={selectedIds}
        onSelect={handleSelect}
      />
    </div>
  )
}
