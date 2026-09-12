import { motion } from 'framer-motion'
import { Skeleton } from './atoms.jsx'

/**
 * Category tabs + filter dropdowns. Every label and option comes from
 * GET /api/filters — nothing here is hardcoded. If the config is unavailable,
 * the controls are omitted rather than rendered with invented options.
 */
export default function TabsAndFilters({
  config,
  status,
  activeCategory,
  onCategoryChange,
  filterValues,
  onFilterChange,
}) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="flex gap-2">
          {[64, 56, 52, 58, 50].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>
        <div className="flex gap-2">
          {[128, 120, 112, 116].map((w, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>
    )
  }

  const categories = config?.categories ?? []
  const filters = config?.filters ?? []
  if (categories.length === 0 && filters.length === 0) return null

  return (
    // min-w-0 so the horizontally scrolling rows below can actually shrink —
    // without it, flex children default to min-width:auto and widen the page.
    <div className="flex min-w-0 flex-col gap-3">
      {categories.length > 0 && (
        <div
          role="tablist"
          aria-label="Market categories"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
        >
          {categories.map((category) => {
            const active = category.id === activeCategory
            return (
              <motion.button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => onCategoryChange(category.id)}
                className={`flex-shrink-0 rounded-lg border px-3.5 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${
                  active
                    ? 'border-vantage-accent/50 bg-vantage-raised font-medium text-vantage-alert'
                    : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
                }`}
              >
                {category.label}
              </motion.button>
            )
          })}
        </div>
      )}

      {filters.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {filters.map((filter) => {
            const value = filterValues[filter.id] ?? ''
            const active = value !== ''
            return (
              <label key={filter.id} className="flex-shrink-0">
                <span className="sr-only">{filter.label}</span>
                <select
                  value={value}
                  onChange={(e) => onFilterChange(filter.id, e.target.value)}
                  className={`h-10 min-w-[9rem] rounded-lg border px-3 text-xs transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${
                    active
                      ? 'border-vantage-accent/50 bg-vantage-raised text-vantage-alert'
                      : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
                  }`}
                >
                  <option value="">{filter.label}</option>
                  {(filter.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
