import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getMarketDetail } from '../services/dashboard.js'
import { PositiveValue, Skeleton, StatusIndicator } from '../components/dashboard/atoms.jsx'
import { Panel, PanelError } from '../components/dashboard/states.jsx'
import PriceHistoryChart from '../components/dashboard/PriceHistoryChart.jsx'

export default function MarketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const market = useAsync(() => getMarketDetail(id), [id])
  const data = market.data

  const handleMethodology = () => {
    navigate('/methodology', {
      state: {
        opportunity: {
          title: data?.title,
          subtitle: data?.subtitle,
          price: data?.consensus?.label,
        },
        backTo: `/markets/${id}`,
        backLabel: 'Back to opportunity',
      },
    })
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8">
      <Link
        to="/markets"
        className="inline-flex min-h-[56px] items-center text-sm text-vantage-textDim hover:text-vantage-text"
      >
        ← Back to markets
      </Link>

      {(market.status === 'loading' || market.status === 'idle') && (
        <div className="flex flex-col gap-5" aria-busy="true">
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
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div>
              {data.title && (
                <h1 className="text-4xl font-semibold tracking-tight text-vantage-text sm:text-5xl">
                  {data.title}
                </h1>
              )}
              {data.subtitle && (
                <p className="mt-2.5 text-base text-vantage-textDim">{data.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-5">
              <StatusIndicator status={data.status} />
              <button
                type="button"
                onClick={handleMethodology}
                className="min-h-[56px] text-sm font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
              >
                How this is calculated →
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            {data.priceHistory?.points?.length > 1 && (
              <Panel className="p-5">
                <PriceHistoryChart history={data.priceHistory} />
              </Panel>
            )}

            {(data.consensus?.label || data.liquidity?.label) && (
              <Panel className="p-6">
                <h2 className="text-lg font-semibold text-vantage-text">Market context</h2>
                <dl className="mt-5 flex flex-col gap-5">
                  {data.consensus?.label && (
                    <div>
                      <dt className="text-sm uppercase tracking-wide text-vantage-alert">
                        Consensus
                      </dt>
                      <dd className="text-lg font-semibold text-vantage-text">
                        {data.consensus.label}
                      </dd>
                    </div>
                  )}
                  {data.liquidity?.label && (
                    <div>
                      <dt className="text-sm uppercase tracking-wide text-vantage-alert">
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
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-vantage-text">Related opportunities</h2>
              <Panel>
                <ul>
                  {data.relatedOpportunities.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-h-[100px] items-center justify-between gap-5 border-b border-vantage-border/60 px-5 py-5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        {item.title && (
                          <p className="truncate text-base text-vantage-text">{item.title}</p>
                        )}
                        {item.subtitle && (
                          <p className="truncate text-sm text-vantage-textDim">{item.subtitle}</p>
                        )}
                      </div>
                      <PositiveValue value={item.ev} className="text-sm" />
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
