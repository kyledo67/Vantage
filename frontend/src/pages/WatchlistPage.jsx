import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { useEvWatchlist } from '../context/EvWatchlistContext.jsx'
import { useParlays } from '../context/ParlayContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getOpportunities, getOpportunityDetail } from '../services/opportunities.js'
import { SectionHeader, Panel, PanelEmpty, RowsSkeleton } from '../components/dashboard/states.jsx'
import OpportunityRow, { COLUMNS } from '../components/dashboard/OpportunityRow.jsx'
import SelectionTray from '../components/dashboard/SelectionTray.jsx'
import BuildParlayModal from '../components/dashboard/BuildParlayModal.jsx'
import { WatchStatusBadge } from '../components/ev/Badges.jsx'
import OddsHistoryChart from '../components/ev/OddsHistoryChart.jsx'
import FilterSelect from '../components/ui/FilterSelect.jsx'

const MOVEMENT_THRESHOLD = 0.3 // EV percentage points

const SORT_OPTIONS = [
  { value: 'ev', label: 'Estimated EV' },
  { value: 'movement', label: 'EV movement' },
  { value: 'addedAt', label: 'Time saved' },
]

function relativeTime(iso) {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.round(diffH / 24)}d ago`
}

/**
 * Watchlist — bookmarked opportunities from the cached EV Finder feed
 * (GET /api/opportunities, same account-scoped cache every other page here
 * uses). There has never been a real GET/POST /api/watchlist endpoint
 * (confirmed against market_data/urls.py — no route exists), so rather than
 * keep this page calling one that always 404s, it resolves the ids saved in
 * EvWatchlistContext against the live opportunity list, the same pattern
 * used to rebuild the Markets page for the same reason.
 */
export default function WatchlistPage() {
  const { entries, removeFromWatchlist, clearAll, recordObservation, getHistory } = useEvWatchlist()
  const { addParlay, showToast } = useParlays()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [platform, setPlatform] = useState('')
  const [sort, setSort] = useState('ev')
  const [hideInactive, setHideInactive] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [selectedMap, setSelectedMap] = useState({})
  const [builderOpen, setBuilderOpen] = useState(false)

  const opportunities = useAsync(() => getOpportunities({}, user?.id), [user?.id])
  const detail = useAsync(
    () => (expandedId ? getOpportunityDetail(expandedId, user?.id) : Promise.resolve(null)),
    [expandedId, user?.id],
    { immediate: Boolean(expandedId) }
  )

  const liveById = useMemo(() => {
    const map = new Map()
    ;(opportunities.data?.results ?? []).forEach((o) => map.set(o.id, o))
    return map
  }, [opportunities.data])

  // Record a genuine history point every time a fetch actually lands new
  // data for a watched opportunity — this is what powers the odds-over-time
  // chart below (real observed values, never generated).
  useEffect(() => {
    entries.forEach((entry) => {
      const live = liveById.get(entry.id)
      if (live?.ev?.value !== undefined && live.ev.value !== null) {
        recordObservation(entry.id, { evValue: live.ev.value, priceLabel: live.price?.label ?? null })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveById])

  const watched = useMemo(() => {
    return entries
      .map((entry) => {
        const live = liveById.get(entry.id)
        if (!live) return { entry, opportunity: null, status: 'stable', evMovement: null }

        const currentEv = live.ev?.value ?? null
        const snapshotEv = entry.snapshot?.evValue ?? null
        const evMovement = currentEv !== null && snapshotEv !== null ? currentEv - snapshotEv : null

        let status = 'stable'
        if (currentEv !== null && currentEv <= 0) status = 'no_longer_positive_ev'
        else if (evMovement !== null && evMovement >= MOVEMENT_THRESHOLD) status = 'improving'
        else if (evMovement !== null && evMovement <= -MOVEMENT_THRESHOLD) status = 'worsening'

        return { entry, opportunity: live, status, evMovement }
      })
      .filter((w) => {
        if (platform && w.opportunity?.platform?.name !== platform) return false
        if (hideInactive && w.status === 'no_longer_positive_ev') return false
        return true
      })
      .sort((a, b) => {
        if (sort === 'movement') return Math.abs(b.evMovement ?? 0) - Math.abs(a.evMovement ?? 0)
        if (sort === 'addedAt') return new Date(b.entry.addedAt) - new Date(a.entry.addedAt)
        return (b.opportunity?.ev?.value ?? -Infinity) - (a.opportunity?.ev?.value ?? -Infinity)
      })
  }, [entries, liveById, platform, hideInactive, sort])

  const platformOptions = useMemo(() => {
    const names = new Set()
    entries.forEach((entry) => {
      const name = liveById.get(entry.id)?.platform?.name
      if (name) names.add(name)
    })
    return Array.from(names).map((name) => ({ value: name, label: name }))
  }, [entries, liveById])

  function handleClearAll() {
    clearAll()
    setConfirmingClear(false)
  }

  function handleSelect(id) {
    setSelectedMap((current) => {
      if (current[id]) {
        const next = { ...current }
        delete next[id]
        return next
      }
      const found = watched.find((w) => w.opportunity?.id === id)?.opportunity
      return found ? { ...current, [id]: found } : current
    })
  }

  async function handleSaveParlay(parlay) {
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
  }

  const selectedOpportunities = Object.values(selectedMap)

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <SectionHeader
        title="Watchlist"
        description="Bookmarked opportunities, continuously re-priced against the live EV Finder feed."
        actions={
          entries.length > 0 &&
          (confirmingClear ? (
            <div className="flex items-center gap-2 rounded-full border border-vantage-danger/40 bg-vantage-danger/10 px-3 py-1.5">
              <span className="text-xs text-vantage-text">Clear all {entries.length}?</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-full bg-vantage-danger px-3 py-1 text-xs font-semibold text-white"
              >
                Yes, clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded-full border border-vantage-border px-3 py-1 text-xs text-vantage-textDim"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="flex min-h-[52px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger"
            >
              Clear all
            </button>
          ))
        }
      />

      {entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="no-scrollbar -mx-1.5 flex gap-2.5 overflow-x-auto px-1.5 pb-0.5">
            <FilterSelect label="Platform" value={platform} options={platformOptions} onChange={setPlatform} />
            <FilterSelect label="Sort by" value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v || 'ev')} />
          </div>
          <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm text-vantage-textDim">
            <input
              type="checkbox"
              checked={hideInactive}
              onChange={(e) => setHideInactive(e.target.checked)}
              className="h-4 w-4 accent-[#CE63E9]"
            />
            Hide no longer +EV
          </label>
        </div>
      )}

      {entries.length === 0 ? (
        <Panel>
          <PanelEmpty
            title="Nothing on your watchlist"
            description="Tap the bookmark icon on any opportunity in the EV Finder and it'll show up here, kept current against the live feed."
            action={
              <Link
                to="/ev-finder"
                className="mt-1.5 flex min-h-[56px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90"
              >
                Browse the EV Finder
              </Link>
            }
          />
        </Panel>
      ) : opportunities.status === 'loading' || opportunities.status === 'idle' ? (
        <Panel>
          <RowsSkeleton rows={Math.min(6, entries.length)} />
        </Panel>
      ) : watched.length === 0 ? (
        <Panel>
          <PanelEmpty title="No watched opportunities match these filters" />
        </Panel>
      ) : (
        <Panel>
          <div
            className={`${COLUMNS} hidden min-h-[56px] items-center border-b border-vantage-border px-5 py-4 lg:grid`}
            role="row"
          >
            {['Event / Selection', 'Market', 'Platform', 'Price', 'Est. hit', 'EV'].map((h) => (
              <span key={h} role="columnheader" className="text-sm font-medium uppercase tracking-wide text-vantage-textDim">
                {h}
              </span>
            ))}
            <span />
            <span />
          </div>
          {watched.map(({ entry, opportunity, status, evMovement }) => (
            <div key={entry.id}>
              <div className="flex flex-wrap items-center gap-2 px-5 pt-3 text-xs text-vantage-textDim">
                <WatchStatusBadge status={status} />
                <span>Saved {relativeTime(entry.addedAt)}</span>
                {evMovement !== null && Math.abs(evMovement) >= 0.05 && (
                  <span className={evMovement >= 0 ? 'text-vantage-positive' : 'text-vantage-danger'}>
                    {evMovement >= 0 ? '+' : ''}
                    {evMovement.toFixed(1)}pp EV since added
                  </span>
                )}
                {!opportunity && (
                  <span className="rounded-full bg-vantage-surfaceAlt px-2 py-0.5">
                    No longer in the live feed — showing the price when saved ({entry.snapshot?.evLabel ?? '—'})
                  </span>
                )}
              </div>
              {opportunity ? (
                <>
                  <OpportunityRow
                    opportunity={opportunity}
                    expanded={expandedId === entry.id}
                    onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
                    detail={expandedId === entry.id ? detail.data : null}
                    detailStatus={expandedId === entry.id ? detail.status : 'idle'}
                    selected={Boolean(selectedMap[opportunity.id])}
                    onSelect={handleSelect}
                  />
                  <div className="grid grid-cols-1 gap-4 border-b border-vantage-border/60 px-5 pb-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-vantage-textDim">
                        EV over time
                      </p>
                      <OddsHistoryChart points={getHistory(entry.id)} />
                    </div>
                    <div className="flex flex-col justify-center gap-1 sm:min-w-[9rem]">
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-vantage-textDim">
                        Est. CLV
                        <span
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-vantage-border text-[9px] normal-case text-vantage-textDim"
                          title="Approximated from EV movement since you saved this — the app doesn't have the market's actual closing price, so this isn't real CLV yet."
                        >
                          ?
                        </span>
                      </p>
                      <p
                        className={`text-lg font-semibold ${
                          evMovement === null
                            ? 'text-vantage-textDim'
                            : evMovement >= 0
                              ? 'text-vantage-positive'
                              : 'text-vantage-danger'
                        }`}
                      >
                        {evMovement === null ? '—' : `${evMovement >= 0 ? '+' : ''}${evMovement.toFixed(1)}pp`}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between px-5 py-5">
                  <p className="text-sm text-vantage-textDim">This opportunity is no longer available.</p>
                  <button
                    type="button"
                    onClick={() => removeFromWatchlist(entry.id)}
                    className="text-sm font-medium text-vantage-textDim transition-colors hover:text-vantage-danger"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}

      <SelectionTray
        count={selectedOpportunities.length}
        onClear={() => setSelectedMap({})}
        onBuild={() => setBuilderOpen(true)}
      />

      <BuildParlayModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        selections={selectedOpportunities}
        onRemove={handleSelect}
        onClearAll={() => setSelectedMap({})}
        onSave={handleSaveParlay}
      />
    </div>
  )
}
