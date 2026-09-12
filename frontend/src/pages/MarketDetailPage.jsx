import { Link, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getMarketDetail } from '../services/dashboard.js'
import { PositiveValue, Skeleton, StatusIndicator } from '../components/dashboard/atoms.jsx'
import { Panel, PanelError } from '../components/dashboard/states.jsx'
import PriceHistoryChart from '../components/dashboard/PriceHistoryChart.jsx'

export default function MarketDetailPage() {
  const { id } = useParams()
  const market = useAsync(() => getMarketDetail(id), [id])
  const data = market.data

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <Link to="/markets" className="text-xs text-vantage-textDim hover:text-vantage-text">
        ← Back to markets
      </Link>

      {(market.status === 'loading' || market.status === 'idle') && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <span className="sr-only" aria-live="polite">
            Loading market…
          </span>
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {market.status === 'error' && (
        <Panel>
          <PanelError
            title="Couldn't load this market"
            description="The market data service didn't respond."
            onRetry={market.refetch}
          />
        </Panel>
      )}

      {market.status === 'success' && data && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {data.title && (
                <h1 className="text-2xl font-semibold tracking-tight text-vantage-text sm:text-3xl">
                  {data.title}
                </h1>
              )}
              {data.subtitle && (
                <p className="mt-1 text-sm text-vantage-textDim">{data.subtitle}</p>
              )}
            </div>
            <StatusIndicator status={data.status} />
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            {data.priceHistory?.points?.length > 1 && (
              <Panel className="p-4">
                <PriceHistoryChart history={data.priceHistory} />
              </Panel>
            )}

            {(data.consensus?.label || data.liquidity?.label) && (
              <Panel className="p-4">
                <h2 className="text-sm font-semibold text-vantage-text">Market context</h2>
                <dl className="mt-3 flex flex-col gap-3">
                  {data.consensus?.label && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">
                        Consensus
                      </dt>
                      <dd className="text-lg font-semibold text-vantage-text">
                        {data.consensus.label}
                      </dd>
                    </div>
                  )}
                  {data.liquidity?.label && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">
                        Liquidity
                      </dt>
                      <dd className="text-lg font-semibold text-vantage-text">
                        {data.liquidity.label}
                      </dd>
                    </div>
                  )}
                </dl>
              </Panel>
            )}
          </div>

          {data.relatedOpportunities?.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-vantage-text">Related opportunities</h2>
              <Panel>
                <ul>
                  {data.relatedOpportunities.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        {item.title && (
                          <p className="truncate text-sm text-vantage-text">{item.title}</p>
                        )}
                        {item.subtitle && (
                          <p className="truncate text-xs text-vantage-textDim">{item.subtitle}</p>
                        )}
                      </div>
                      <PositiveValue value={item.ev} className="text-xs" />
                    </li>
                  ))}
                </ul>
              </Panel>
            </section>
          )}
        </>
      )}
    </div>
  )
}
