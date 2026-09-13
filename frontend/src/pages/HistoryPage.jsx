import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useParlays } from '../context/ParlayContext.jsx'
import ParlayDetailsModal from '../components/dashboard/ParlayDetailsModal.jsx'
import { Panel, PanelEmpty, SectionHeader } from '../components/dashboard/states.jsx'

const inputClass =
  'h-14 rounded-lg border border-vantage-border bg-vantage-surface px-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent'

/**
 * There's no backend activity feed yet — the parlay builder is the only
 * place the app records anything a user has actually done, so History is the
 * same per-account saved-parlay list (see ParlayContext.jsx),
 * presented as a searchable/date-filterable timeline instead of a card
 * grid. Renaming/removing still happens on the My Parlays page; this view
 * is read-only aside from the user marking a saved parlay as won or lost.
 */
export default function HistoryPage() {
  const { savedParlays, setParlayOutcome } = useParlays()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detailsParlay, setDetailsParlay] = useState(null)

  const filtered = Boolean(search.trim() || from || to)

  const events = useMemo(() => {
    const query = search.trim().toLowerCase()
    const fromTime = from ? new Date(from).getTime() : null
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null

    return savedParlays.filter((parlay) => {
      if (query) {
        const haystack = [parlay.name, ...(parlay.selections?.map((s) => s.title) ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      const createdAt = new Date(parlay.createdAt).getTime()
      if (fromTime !== null && createdAt < fromTime) return false
      if (toTime !== null && createdAt > toTime) return false
      return true
    })
  }, [savedParlays, search, from, to])

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <SectionHeader
        title="History"
        description="A record of your saved parlays. Mark results to update your home performance summary."
      />

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm uppercase tracking-wide text-vantage-textDim">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parlays"
            className={`${inputClass} w-52`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm uppercase tracking-wide text-vantage-textDim">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm uppercase tracking-wide text-vantage-textDim">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFrom('')
              setTo('')
            }}
            className="flex h-14 items-center rounded-lg border border-vantage-border px-5 text-base text-vantage-textDim transition-colors hover:text-vantage-text"
          >
            Clear
          </button>
        )}
      </div>

      <Panel>
        {events.length === 0 ? (
          <PanelEmpty
            title={filtered ? 'No parlays in this range' : 'No activity yet'}
            description={
              filtered
                ? 'Try widening the date range or clearing the search.'
                : 'Save a parlay from the EV Finder to see it recorded here.'
            }
            action={
              !filtered && (
                <Link
                  to="/ev-finder"
                  className="mt-1.5 flex min-h-[62px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90"
                >
                  Browse opportunities
                </Link>
              )
            }
          />
        ) : (
          <ol>
            {events.map((parlay) => {
              const count = parlay.selections?.length ?? 0
              const outcome = parlay.outcome ?? 'pending'
              const outcomeLabel = outcome === 'won' ? 'Won' : outcome === 'lost' ? 'Lost' : 'Pending'
              const outcomeClass =
                outcome === 'won'
                  ? 'bg-vantage-positive/15 text-vantage-positive'
                  : outcome === 'lost'
                    ? 'bg-vantage-danger/15 text-vantage-danger'
                    : 'bg-vantage-raised text-vantage-alert'
              return (
                <li
                  key={parlay.id}
                  className="flex flex-col gap-3 border-b border-vantage-border/60 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() => setDetailsParlay(parlay)}
                    className="flex min-h-[76px] min-w-0 flex-1 items-start gap-5 text-left transition-colors hover:text-vantage-accent"
                  >
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-vantage-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                        <p className="truncate text-base text-vantage-text">{parlay.name}</p>
                        <time dateTime={parlay.createdAt} className="text-xs text-vantage-textDim">
                          {new Date(parlay.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="mt-0.5 text-sm text-vantage-textDim">
                        {count} {count === 1 ? 'selection' : 'selections'}
                        {parlay.estimatedEdge && <> · Edge {parlay.estimatedEdge}</>}
                        {parlay.estimatedChance && <> · Chance {parlay.estimatedChance}</>}
                      </p>
                      <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs uppercase ${outcomeClass}`}>
                        {outcomeLabel}
                      </span>
                    </div>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-1.5" aria-label={`Result for ${parlay.name}`}>
                    <span className="mr-1 text-xs text-vantage-textDim">Result</span>
                    <button
                      type="button"
                      onClick={() => setParlayOutcome(parlay.id, 'won')}
                      aria-pressed={outcome === 'won'}
                      className={`min-h-[36px] rounded-md border px-3 text-xs font-medium transition-colors ${
                        outcome === 'won'
                          ? 'border-vantage-positive bg-vantage-positive/15 text-vantage-positive'
                          : 'border-vantage-border text-vantage-textDim hover:border-vantage-positive hover:text-vantage-positive'
                      }`}
                    >
                      Won
                    </button>
                    <button
                      type="button"
                      onClick={() => setParlayOutcome(parlay.id, 'lost')}
                      aria-pressed={outcome === 'lost'}
                      className={`min-h-[36px] rounded-md border px-3 text-xs font-medium transition-colors ${
                        outcome === 'lost'
                          ? 'border-vantage-danger bg-vantage-danger/15 text-vantage-danger'
                          : 'border-vantage-border text-vantage-textDim hover:border-vantage-danger hover:text-vantage-danger'
                      }`}
                    >
                      Lost
                    </button>
                    {outcome !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => setParlayOutcome(parlay.id, 'pending')}
                        className="min-h-[36px] rounded-md border border-vantage-border px-3 text-xs text-vantage-textDim transition-colors hover:text-vantage-text"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>

      <ParlayDetailsModal parlay={detailsParlay} onClose={() => setDetailsParlay(null)} />
    </div>
  )
}
