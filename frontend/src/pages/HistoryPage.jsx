import { useEffect, useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import { getHistory } from '../services/dashboard.js'
import {
  DataPanel,
  Panel,
  PanelEmpty,
  SectionHeader,
} from '../components/dashboard/states.jsx'

const inputClass =
  'h-14 rounded-lg border border-vantage-border bg-vantage-surface px-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent'

export default function HistoryPage() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setSearch(input.trim()), 250)
    return () => clearTimeout(id)
  }, [input])

  const query = useMemo(() => ({ search, from, to }), [search, from, to])
  const history = useAsync(() => getHistory(query), [query])

  const events = history.data?.events ?? []
  const filtered = search || from || to

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <SectionHeader
        title="History"
        description="A record of your activity and the market events behind it."
      />

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm uppercase tracking-wide text-vantage-textDim">Search</span>
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search activity"
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
              setInput('')
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
        <DataPanel
          status={history.status}
          isEmpty={events.length === 0}
          onRetry={history.refetch}
          empty={
            <PanelEmpty
              title={filtered ? 'No activity in this range' : 'No activity yet'}
              description={
                filtered
                  ? 'Try widening the date range or clearing the search.'
                  : 'Saved picks, viewed opportunities, and triggered alerts will be recorded here.'
              }
            />
          }
        >
          <ol>
            {events.map((event) => (
              <li
                key={event.id}
                className="flex gap-5 border-b border-vantage-border/60 min-h-[100px] px-5 py-5 last:border-b-0"
              >
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-vantage-accent" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                    {event.title && (
                      <p className="truncate text-base text-vantage-text">{event.title}</p>
                    )}
                    {event.at && (
                      <time dateTime={event.at} className="text-xs text-vantage-textDim">
                        {new Date(event.at).toLocaleString()}
                      </time>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-0.5 text-sm text-vantage-textDim">{event.description}</p>
                  )}
                  {event.type && (
                    <span className="mt-2 inline-block rounded bg-vantage-raised px-2 py-0.5 text-xs uppercase text-vantage-alert">
                      {event.type}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </DataPanel>
      </Panel>
    </div>
  )
}
