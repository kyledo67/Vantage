import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getWatchlist, removeFromWatchlist } from '../services/dashboard.js'
import { StatusIndicator } from '../components/dashboard/atoms.jsx'
import {
  DataPanel,
  Panel,
  PanelEmpty,
  SectionHeader,
} from '../components/dashboard/states.jsx'

export default function WatchlistPage() {
  const watchlist = useAsync(getWatchlist, [])
  const [removing, setRemoving] = useState(null)

  const handleRemove = useCallback(
    async (id) => {
      setRemoving(id)
      try {
        await removeFromWatchlist(id)
        await watchlist.refetch()
      } finally {
        setRemoving(null)
      }
    },
    [watchlist]
  )

  const items = watchlist.data?.items ?? []

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <SectionHeader
        title="Watchlist"
        description="Markets, players, and contracts you're following."
      />

      <Panel>
        <DataPanel
          status={watchlist.status}
          isEmpty={items.length === 0}
          onRetry={watchlist.refetch}
          empty={
            <PanelEmpty
              title="Nothing on your watchlist"
              description="Save a market from the EV Finder and it will appear here with its current price and consensus movement."
              action={
                <Link
                  to="/ev-finder"
                  className="mt-1 rounded-full border border-vantage-border px-4 py-1.5 text-xs font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
                >
                  Browse the EV Finder
                </Link>
              }
            />
          }
        >
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3.5 last:border-b-0 hover:bg-vantage-surfaceAlt/60"
              >
                <div className="min-w-0 flex-1">
                  {item.title && (
                    <p className="truncate text-sm font-medium text-vantage-text">{item.title}</p>
                  )}
                  {item.subtitle && (
                    <p className="truncate text-xs text-vantage-textDim">{item.subtitle}</p>
                  )}
                  {item.alerts?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.alerts.map((alert) => (
                        <span
                          key={alert.id}
                          className="rounded bg-vantage-raised px-1.5 py-0.5 text-[10px] text-vantage-alert"
                        >
                          {alert.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-5 text-xs">
                  {item.price?.label && (
                    <span className="font-medium text-vantage-text">{item.price.label}</span>
                  )}
                  <StatusIndicator status={item.movement} />
                  <StatusIndicator status={item.availability} />
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                    className="rounded border border-vantage-border px-2 py-1 text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger disabled:opacity-50"
                  >
                    {removing === item.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </DataPanel>
      </Panel>
    </div>
  )
}
