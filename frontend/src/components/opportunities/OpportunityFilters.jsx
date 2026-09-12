import { PLATFORMS, SPORTS, MARKET_TYPES, CONFIDENCE_LEVELS } from '../../utils/constants.js'

const selectClass =
  'rounded-md border border-vantage-border bg-vantage-surface px-2.5 py-1.5 text-xs text-vantage-text focus:border-vantage-accent focus:outline-none'

export default function OpportunityFilters({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectClass} value={filters.platform || ''} onChange={set('platform')}>
        <option value="">All platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.sport || ''} onChange={set('sport')}>
        <option value="">All sports</option>
        {SPORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.marketType || ''} onChange={set('marketType')}>
        <option value="">All market types</option>
        {MARKET_TYPES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select className={selectClass} value={filters.confidence || ''} onChange={set('confidence')}>
        <option value="">Any confidence</option>
        {CONFIDENCE_LEVELS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-xs text-vantage-textDim">
        Min. ROI
        <input
          type="number"
          step="0.01"
          min="0"
          className={selectClass}
          style={{ width: '5rem' }}
          value={filters.minEv || ''}
          onChange={set('minEv')}
          placeholder="0.03"
        />
      </label>
    </div>
  )
}
