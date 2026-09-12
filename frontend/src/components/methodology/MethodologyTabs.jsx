import { useRef } from 'react'
import { motion } from 'framer-motion'
import { DURATION, EASE } from '../../motion/tokens.js'

const ARROW_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End']

/**
 * Sticky horizontal tablist — proper tab/tablist/tabpanel semantics, arrow-key
 * navigation, and a single shared-layout element for the active indicator so
 * it slides between tabs instead of one fading out while another fades in.
 */
export default function MethodologyTabs({ tabs, activeId, onChange }) {
  const refs = useRef({})

  const handleKeyDown = (event, index) => {
    if (!ARROW_KEYS.includes(event.key)) return
    event.preventDefault()
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    const next = tabs[nextIndex]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Methodology sections"
      className="no-scrollbar sticky top-[72px] z-20 flex gap-8 overflow-x-auto border-b border-vantage-border bg-vantage-bg/95 backdrop-blur"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el
            }}
            id={`methodology-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`methodology-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="relative flex-shrink-0 whitespace-nowrap pb-4 pt-5 text-sm focus-visible:outline-none"
          >
            <span
              className={`transition-colors duration-200 ${
                isActive ? 'font-medium text-vantage-text' : 'text-vantage-textDim hover:text-vantage-text'
              }`}
            >
              {tab.label}
            </span>
            {isActive && (
              <motion.span
                layoutId="methodology-tab-indicator"
                transition={{ duration: DURATION.nav, ease: EASE.out }}
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-vantage-accent"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
