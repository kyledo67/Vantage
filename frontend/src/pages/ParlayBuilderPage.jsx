import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getParlay, removeParlayLeg } from '../services/dashboard.js'
import {
  DataPanel,
  Panel,
  PanelEmpty,
  SectionHeader,
} from '../components/dashboard/states.jsx'

export default function ParlayBuilderPage() {
  const parlay = useAsync(getParlay, [])
  const [removing, setRemoving] = useState(null)

  const handleRemove = useCallback(
    async (id) => {
      setRemoving(id)
      try {
        await removeParlayLeg(id)
        await parlay.refetch()
      } finally {
        setRemoving(null)
      }
    },
    [parlay]
  )

  const legs = parlay.data?.legs ?? []
  // Combined figures are computed server-side only — never derived here.
  const combined = parlay.data?.combined ?? null

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <SectionHeader
        title="Parlay Builder"
        description="Review several contracts together to understand combined exposure."
      />

      <p className="rounded-lg border border-vantage-alert/30 bg-vantage-alert/10 px-4 py-3 text-xs text-vantage-text">
        Scenario planning only. Vantage does not place trades, and nothing here is an
        instruction to act.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <DataPanel
            status={parlay.status}
            isEmpty={legs.length === 0}
            onRetry={parlay.refetch}
            empty={
              <PanelEmpty
                title="No contracts selected"
                description="Add saved opportunities to see how they look together."
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
              {legs.map((leg) => (
                <li
                  key={leg.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    {leg.title && (
                      <p className="truncate text-sm font-medium text-vantage-text">{leg.title}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-vantage-textDim">
                      {leg.subtitle && <span className="truncate">{leg.subtitle}</span>}
                      {leg.platform?.name && <span>{leg.platform.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {leg.price?.label && (
                      <span className="font-medium text-vantage-text">{leg.price.label}</span>
                    )}
                    {leg.implied?.label && (
                      <span className="text-vantage-textDim">{leg.implied.label}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(leg.id)}
                      disabled={removing === leg.id}
                      className="rounded border border-vantage-border px-2 py-1 text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger disabled:opacity-50"
                    >
                      {removing === leg.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </DataPanel>
        </Panel>

        {/* Combined analysis appears only when the backend supplies it. */}
        {parlay.status === 'success' && combined && (
          <Panel className="p-4">
            <h2 className="text-sm font-semibold text-vantage-text">Combined view</h2>
            <dl className="mt-3 flex flex-col gap-3">
              {combined.exposure?.label && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">
                    Combined exposure
                  </dt>
                  <dd className="text-lg font-semibold text-vantage-text">
                    {combined.exposure.label}
                  </dd>
                </div>
              )}
              {combined.impliedOutcome?.label && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">
                    Implied outcome
                  </dt>
                  <dd className="text-lg font-semibold text-vantage-text">
                    {combined.impliedOutcome.label}
                  </dd>
                </div>
              )}
            </dl>
            {combined.notes?.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 border-t border-vantage-border pt-3">
                {combined.notes.map((note) => (
                  <li key={note} className="text-[11px] leading-relaxed text-vantage-textDim">
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
