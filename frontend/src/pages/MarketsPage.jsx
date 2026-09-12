import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getMarkets } from '../services/dashboard.js'
import { StatusIndicator } from '../components/dashboard/atoms.jsx'
import {
  DataPanel,
  Panel,
  PanelEmpty,
  SectionHeader,
} from '../components/dashboard/states.jsx'

export default function MarketsPage() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounced — the query goes to the API, not to a local array.
  useEffect(() => {
    const id = setTimeout(() => setSearch(input.trim()), 250)
    return () => clearTimeout(id)
  }, [input])

  const query = useMemo(() => ({ search }), [search])
  const markets = useAsync(() => getMarkets(query), [query])

  const groups = markets.data?.groups ?? []
  const isEmpty = groups.every((group) => (group.items?.length ?? 0) === 0)

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <SectionHeader
        title="Markets"
        description="Browse sports, leagues, events, and prediction-market contracts."
        actions={
          <label className="relative">
            <span className="sr-only">Search markets</span>
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search markets"
              className="h-14 w-60 rounded-full border border-vantage-border bg-vantage-surface px-6 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent"
            />
          </label>
        }
      />

      <Panel>
        <DataPanel
          status={markets.status}
          isEmpty={groups.length === 0 || isEmpty}
          onRetry={markets.refetch}
          empty={
            <PanelEmpty
              title={search ? 'No markets match that search' : 'No markets available'}
              description={
                search
                  ? 'Try a different player, team, or competition.'
                  : 'Available markets will be listed here once the data service provides them.'
              }
            />
          }
        >
          <div>
            {groups.map((group) =>
              (group.items?.length ?? 0) === 0 ? null : (
                <section key={group.id}>
                  {group.label && (
                    <h2 className="border-b border-vantage-border bg-vantage-surfaceAlt/50 px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-vantage-alert">
                      {group.label}
                    </h2>
                  )}
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id} className="border-b border-vantage-border/60 last:border-b-0">
                        <Link
                          to={`/markets/${item.id}`}
                          className="flex min-h-[100px] items-center justify-between gap-5 px-5 py-5 transition-colors hover:bg-vantage-surfaceAlt/60"
                        >
                          <div className="min-w-0">
                            {item.name && (
                              <p className="truncate text-base text-vantage-text">{item.name}</p>
                            )}
                            {item.subtitle && (
                              <p className="mt-0.5 truncate text-sm text-vantage-textDim">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <StatusIndicator status={item.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            )}
          </div>
        </DataPanel>
      </Panel>
    </div>
  )
}
