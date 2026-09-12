import { useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { COUNTRIES } from '../../utils/countries.js'

/**
 * Searchable country combobox — name + flag. Selecting a country never
 * decides availability itself; it only reports the choice back up so the
 * page can ask the backend.
 */
export default function CountrySelect({ value, onChange, suggested }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const listId = useId()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter((country) => country.name.toLowerCase().includes(q))
  }, [query])

  const reduceMotion = useReducedMotion()

  function handleSelect(country) {
    onChange(country)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-vantage-text">Country</span>
        <div className="relative">
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={open ? query : (value?.name ?? '')}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search for your country"
            className="h-14 w-full rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-4 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent"
          />
          {!open && value?.flag && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
              {value.flag}
            </span>
          )}
        </div>
      </label>

      {!open && suggested && (!value || value.code !== suggested.code) && (
        <button
          type="button"
          onClick={() => handleSelect(suggested)}
          className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-vantage-alert transition-colors hover:text-vantage-accent"
        >
          <span aria-hidden="true">{suggested.flag}</span>
          Did you mean {suggested.name}?
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Country"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-vantage-border bg-vantage-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-vantage-textDim">No countries match.</li>
            ) : (
              filtered.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value?.code === country.code}
                    // onMouseDown fires before the input's onBlur, so the click
                    // still registers instead of the list closing first.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(country)}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-md px-3 text-left text-base transition-colors hover:bg-vantage-raised ${
                      value?.code === country.code ? 'text-vantage-alert' : 'text-vantage-text'
                    }`}
                  >
                    <span aria-hidden="true" className="text-lg">
                      {country.flag}
                    </span>
                    {country.name}
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
