import { motion } from 'framer-motion'
import { Skeleton } from './atoms.jsx'
import FilterSelect from '../ui/FilterSelect.jsx'
import { PRESS_BUTTON, SPRING_PILL } from '../../motion/tokens.js'

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
                whileTap={PRESS_BUTTON}
                onClick={() => onCategoryChange(category.id)}
                className={`relative flex-shrink-0 rounded-lg border px-3.5 py-2 text-xs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${
                  active
                    ? 'border-vantage-accent/50 font-medium text-vantage-alert'
                    : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
                }`}
              >
                {/* Shared element: the plum background travels between tabs. */}
                {active && (
                  <motion.span
                    layoutId="category-tab-indicator"
                    transition={SPRING_PILL}
                    className="absolute inset-0 -z-10 rounded-lg bg-vantage-raised"
                  />
                )}
                {category.label}
              </motion.button>
            )
          })}
        </div>
      )}

      {filters.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {filters.map((filter) => (
            <FilterSelect
              key={filter.id}
              label={filter.label}
              value={filterValues[filter.id] ?? ''}
              options={filter.options ?? []}
              onChange={(next) => onFilterChange(filter.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
