import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { DURATION, EASE } from '../motion/tokens.js'
import MethodologyTabs from '../components/methodology/MethodologyTabs.jsx'
import HowVantageWorksTab from '../components/methodology/HowVantageWorksTab.jsx'
import BettingBasicsTab from '../components/methodology/BettingBasicsTab.jsx'
import EdgeRiskTab from '../components/methodology/EdgeRiskTab.jsx'

const TABS = [
  { id: 'how-it-works', label: 'How Vantage Works' },
  { id: 'betting-basics', label: 'Betting Basics' },
  { id: 'edge-risk', label: 'Edge & Risk' },
]

const TAB_CONTENT = {
  'how-it-works': HowVantageWorksTab,
  'betting-basics': BettingBasicsTab,
  'edge-risk': EdgeRiskTab,
}

/**
 * Vantage Learning Center — dashboard-native methodology + betting-basics +
 * edge/risk explainer, reached from the "Methodology" nav item. Replaces the
 * old plain-text /about page entirely.
 */
export default function MethodologyPage() {
  const location = useLocation()
  const opportunity = location.state?.opportunity
  const backTo = location.state?.backTo
  const backLabel = location.state?.backLabel ?? 'Back to opportunity'
  const hasContext = Boolean(opportunity?.title || opportunity?.subtitle)

  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const ActiveTabContent = TAB_CONTENT[activeTab]

  return (
    // Cancels the dashboard shell's own p-4/sm:p-6 so this page can use its
    // own spec'd padding (24px mobile, 64px/56px desktop) without doubling up.
    <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-6 py-4 sm:px-16 sm:py-14">
        {hasContext && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.expand, ease: EASE.out }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-vantage-border bg-vantage-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-vantage-alert">
                Viewing methodology for this opportunity
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-vantage-textDim">
                {opportunity.title && (
                  <span className="truncate font-medium text-vantage-text">{opportunity.title}</span>
                )}
                {opportunity.subtitle && <span className="truncate">{opportunity.subtitle}</span>}
                {opportunity.platform && <span>{opportunity.platform}</span>}
                {opportunity.price && <span>{opportunity.price}</span>}
                {opportunity.ev && <span className="text-vantage-positive">{opportunity.ev} EV</span>}
              </div>
            </div>
            {backTo && (
              <Link
                to={backTo}
                className="flex-shrink-0 text-xs font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
              >
                ← {backLabel}
              </Link>
            )}
          </motion.div>
        )}

        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-vantage-accent">
            Learn Vantage
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-vantage-text sm:text-3xl">
            Understand the price before you take a position.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-vantage-textDim">
            Vantage compares available sports-market prices with broader market context to help
            you understand whether a contract may be priced favorably.
          </p>
        </header>

        <MethodologyTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

        <div className="min-h-[20rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              role="tabpanel"
              id={`methodology-panel-${activeTab}`}
              aria-labelledby={`methodology-tab-${activeTab}`}
              tabIndex={0}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION.expand, ease: EASE.out }}
            >
              <ActiveTabContent />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-5 border-t border-vantage-border pt-6">
          <Link
            to="/ev-finder"
            className="rounded-full bg-vantage-accent px-5 py-2.5 text-sm font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
          >
            Explore opportunities
          </Link>
          <Link
            to={backTo ?? '/ev-finder'}
            className="text-sm font-medium text-vantage-textDim transition-colors hover:text-vantage-text"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
