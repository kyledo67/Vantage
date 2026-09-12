import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION, EASE } from '../../motion/tokens.js'

/**
 * Accessible filter dropdown. Replaces a native <select> so the panel can
 * animate (native popups can't be styled or animated), while keeping listbox
 * keyboard semantics: Enter/Space open, arrows move, Home/End jump, Esc closes,
 * Tab/click-away dismisses.
 */
export default function FilterSelect({ label, value, options = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  // The filter row scrolls horizontally, and a scroll container clips both
  // axes — so the panel is portalled to <body> and positioned from the
  // trigger's viewport rect instead of being nested inside the scroller.
  const syncRect = useCallback(() => {
    const el = buttonRef.current
    if (el) setRect(el.getBoundingClientRect())
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    syncRect()
    window.addEventListener('resize', syncRect)
    window.addEventListener('scroll', syncRect, true)
    return () => {
      window.removeEventListener('resize', syncRect)
      window.removeEventListener('scroll', syncRect, true)
    }
  }, [open, syncRect])

  const items = [{ value: '', label }, ...options]
  const selectedIndex = Math.max(
    0,
    items.findIndex((o) => o.value === (value ?? ''))
  )
  const selected = items[selectedIndex]
  const isActive = (value ?? '') !== ''

  useEffect(() => {
    if (!open) return undefined
    setActiveIndex(selectedIndex)
    const onClickAway = (e) => {
      const insideTrigger = rootRef.current?.contains(e.target)
      const insideList = listRef.current?.contains(e.target)
      if (!insideTrigger && !insideList) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [open, selectedIndex])

  function commit(index) {
    onChange(items[index].value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(items.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commit(activeIndex)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`flex h-10 min-w-[9rem] items-center justify-between gap-3 rounded-lg border px-3 text-xs transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${
          isActive || open
            ? 'border-vantage-accent/50 bg-vantage-raised text-vantage-alert'
            : 'border-vantage-border bg-vantage-surface text-vantage-textDim hover:text-vantage-text'
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          width="9"
          height="6"
          viewBox="0 0 10 6"
          aria-hidden="true"
          className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.ul
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label={label}
              aria-activedescendant={`${listId}-${activeIndex}`}
              tabIndex={-1}
              initial={{ opacity: 0, scaleY: 0.92 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.96 }}
              transition={{ duration: DURATION.interaction, ease: EASE.out }}
              style={{
                originY: 0,
                position: 'fixed',
                top: rect.bottom + 6,
                left: rect.left,
                minWidth: rect.width,
              }}
              onKeyDown={handleKeyDown}
              className="z-50 max-h-60 overflow-auto rounded-lg border border-vantage-border bg-vantage-surface p-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]"
            >
            {items.map((option, index) => {
              const isSelected = index === selectedIndex
              return (
                <li
                  key={option.value || '__all'}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 ${
                    index === activeIndex ? 'bg-vantage-raised' : ''
                  } ${isSelected ? 'text-vantage-alert' : 'text-vantage-textDim'}`}
                >
                  {option.label}
                </li>
              )
            })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
