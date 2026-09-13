import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import TabsAndFilters from '../components/dashboard/TabsAndFilters.jsx'
import OpportunitiesTable from '../components/dashboard/OpportunitiesTable.jsx'
import SelectionTray from '../components/dashboard/SelectionTray.jsx'
import BuildParlayModal from '../components/dashboard/BuildParlayModal.jsx'
import { Skeleton, StatusIndicator } from '../components/dashboard/atoms.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useParlays } from '../context/ParlayContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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
  const navigate = useNavigate()
  const { addParlay, showToast } = useParlays()
  const { user } = useAuth()

  const [category, setCategory] = useState('')
  const [filterValues, setFilterValues] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  // Keyed by id rather than a plain id list, so a selection made from one page
  // of results survives a refetch/filter change without losing the
  // opportunity's data — everything the parlay builder needs stays local.
  const [selectedMap, setSelectedMap] = useState({})
  const [builderOpen, setBuilderOpen] = useState(false)
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
    return getOpportunities({ ...query, refresh: refresh ? 'true' : undefined }, user?.id)
  }, [query, user?.id])

  const feed = useAsync(loadFeed, [loadFeed])

  const detail = useAsync(
    () => (expandedId ? getOpportunityDetail(expandedId, user?.id) : Promise.resolve(null)),
    [expandedId, user?.id],
    { immediate: Boolean(expandedId) }
  )

  const handleToggle = useCallback((id) => {
    // Opening a row collapses whichever row was open before.
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  const rows = useMemo(() => feed.data?.results ?? [], [feed.data])

  const handleSelect = useCallback(
    (id) => {
      setSelectedMap((current) => {
        if (current[id]) {
          const next = { ...current }
          delete next[id]
          return next
        }
        const opportunity = rows.find((row) => row.id === id)
        return opportunity ? { ...current, [id]: opportunity } : current
      })
    },
    [rows]
  )

  const handleClearSelection = useCallback(() => setSelectedMap({}), [])

  const handleRemoveSelection = useCallback((id) => {
    setSelectedMap((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const handleSaveParlay = useCallback(
    async (parlay) => {
      try {
        await addParlay(parlay)
        setSelectedMap({})
        setBuilderOpen(false)
        showToast({
          message: 'Saved to My Parlays.',
          actionLabel: 'View My Parlays',
          onAction: () => navigate('/parlay'),
        })
      } catch {
        // ParlayContext shows the save failure toast.
      }
    },
    [addParlay, navigate, showToast]
  )

  const handleFilterChange = useCallback((id, value) => {
    setFilterValues((current) => ({ ...current, [id]: value }))
  }, [])

  const handleRefresh = useCallback(() => {
    refreshRequested.current = true
    setExpandedId(null)
    feed.refetch()
  }, [feed.refetch])

  const live = feed.data?.live
  const updatedLabel = formatUpdated(live?.updatedAt)
  const selectedOpportunities = useMemo(() => Object.values(selectedMap), [selectedMap])
  const selectedIds = useMemo(() => Object.keys(selectedMap), [selectedMap])

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-vantage-text sm:text-5xl">
            Opportunities
          </h1>
          <p className="mt-2.5 text-base leading-relaxed text-vantage-textDim">
            Market signals priced below broader consensus.
          </p>
        </div>

        <div className="flex items-center gap-4">
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
            className="flex min-h-[56px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent disabled:cursor-wait disabled:opacity-50"
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

      <SelectionTray
        count={selectedOpportunities.length}
        onClear={handleClearSelection}
        onBuild={() => setBuilderOpen(true)}
      />

      <BuildParlayModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        selections={selectedOpportunities}
        onRemove={handleRemoveSelection}
        onClearAll={handleClearSelection}
        onSave={handleSaveParlay}
      />
    </div>
  )
}
