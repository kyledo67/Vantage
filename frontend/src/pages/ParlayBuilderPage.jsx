import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHeader, Panel, PanelEmpty } from '../components/dashboard/states.jsx'
import ParlayDetailsModal from '../components/dashboard/ParlayDetailsModal.jsx'
import { useParlays } from '../context/ParlayContext.jsx'

function ParlayNameField({ parlay, onRename }) {
  const [value, setValue] = useState(parlay.name)

  // Stay in sync if the parlay is renamed elsewhere (e.g. another card instance).
  useEffect(() => setValue(parlay.name), [parlay.name])

  const commit = () => {
    const next = value.trim() || 'Untitled parlay'
    setValue(next)
    if (next !== parlay.name) onRename(parlay.id, next)
  }

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      aria-label="Parlay name"
      className="w-full truncate bg-transparent text-sm font-semibold text-vantage-text outline-none focus-visible:underline focus-visible:decoration-vantage-accent"
    />
  )
}

function ParlayCard({ parlay, onRename, onRemove, onViewDetails }) {
  const count = parlay.selections?.length ?? 0
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl border border-vantage-accent/30 bg-vantage-surface p-4"
    >
      <ParlayNameField parlay={parlay} onRename={onRename} />
      <p className="mt-1 text-[11px] text-vantage-textDim">
        {count} {count === 1 ? 'selection' : 'selections'}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">Estimated Edge</dt>
          <dd
            className={`mt-0.5 text-sm font-semibold ${
              parlay.estimatedEdge ? 'text-vantage-positive' : 'text-vantage-textDim'
            }`}
          >
            {parlay.estimatedEdge ?? 'Unavailable'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">Estimated Chance</dt>
          <dd
            className={`mt-0.5 text-sm font-semibold ${
              parlay.estimatedChance ? 'text-vantage-positive' : 'text-vantage-textDim'
            }`}
          >
            {parlay.estimatedChance ?? 'Unavailable'}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-vantage-textDim">
        Created{' '}
        {new Date(parlay.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{' '}
        · this session
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onViewDetails(parlay)}
          className="rounded-full border border-vantage-accent/50 px-3 py-1.5 text-xs font-medium text-vantage-accent transition-colors hover:bg-vantage-accent/10"
        >
          View details
        </button>
        <button
          type="button"
          onClick={() => onRemove(parlay.id)}
          className="rounded-full border border-vantage-border px-3 py-1.5 text-xs font-medium text-vantage-textDim transition-colors hover:border-vantage-danger hover:text-vantage-danger"
        >
          Remove
        </button>
      </div>
    </motion.li>
  )
}

export default function ParlayBuilderPage() {
  const { savedParlays, removeParlay, renameParlay } = useParlays()
  const [detailsParlay, setDetailsParlay] = useState(null)

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-6">
      <SectionHeader
        title="My Parlays"
        description="Your saved hypothetical multi-selection analyses."
      />

      {savedParlays.length === 0 ? (
        <Panel>
          <PanelEmpty
            title="No saved parlays"
            description="Select opportunities to build a hypothetical parlay."
            action={
              <Link
                to="/ev-finder"
                className="mt-1 rounded-full bg-vantage-accent px-4 py-1.5 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90"
              >
                Browse opportunities
              </Link>
            }
          />
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {savedParlays.map((parlay) => (
              <ParlayCard
                key={parlay.id}
                parlay={parlay}
                onRename={renameParlay}
                onRemove={removeParlay}
                onViewDetails={setDetailsParlay}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ParlayDetailsModal parlay={detailsParlay} onClose={() => setDetailsParlay(null)} />
    </div>
  )
}
