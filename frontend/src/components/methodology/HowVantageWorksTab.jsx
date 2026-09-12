import { useState } from 'react'
import { motion } from 'framer-motion'
import { DURATION, EASE } from '../../motion/tokens.js'
import Accordion from './Accordion.jsx'
import {
  AdvantageIcon,
  CheckIcon,
  ChevronIcon,
  CompareIcon,
  FormulaIcon,
  MetaIcon,
  SearchCardIcon,
  XIcon,
} from './icons.jsx'

const STEPS = [
  {
    id: 'find',
    title: 'Find a matching market',
    description:
      'Vantage starts with an available sports prediction contract and looks for matching market information.',
    Icon: SearchCardIcon,
  },
  {
    id: 'compare',
    title: 'Compare the price',
    description:
      'Vantage compares the available contract price with relevant broader market information.',
    Icon: CompareIcon,
  },
  {
    id: 'margin',
    title: 'Remove the margin',
    description:
      'Sportsbook prices often include a built-in margin, sometimes called vig. Vantage uses both sides of a matching market to estimate a cleaner market probability.',
    Icon: FormulaIcon,
    formula: true,
  },
  {
    id: 'advantage',
    title: 'Estimate the price advantage',
    description: 'Vantage compares the broader market estimate with the price currently available.',
    Icon: AdvantageIcon,
    example: true,
  },
  {
    id: 'confidence',
    title: 'Show confidence and context',
    description:
      'Vantage shows freshness, supporting-market coverage, liquidity context, and confidence so users can judge how much weight to give the analysis.',
    Icon: MetaIcon,
  },
]

export default function HowVantageWorksTab() {
  const [formulaOpen, setFormulaOpen] = useState(false)

  return (
    <div className="flex flex-col gap-10">
      <ol className="flex flex-col gap-1">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.expand, ease: EASE.out, delay: index * 0.04 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-vantage-accentEnd/50 bg-vantage-raised text-vantage-accent">
                <step.Icon />
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 bg-gradient-to-b from-vantage-accentEnd/50 to-transparent"
                />
              )}
            </div>

            <div className="flex-1 pb-8">
              <h3 className="text-sm font-semibold text-vantage-text">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-vantage-textDim">
                {step.description}
              </p>

              {step.formula && (
                <Accordion
                  open={formulaOpen}
                  onToggle={() => setFormulaOpen((current) => !current)}
                  className="mt-3 max-w-sm rounded-lg border border-vantage-border bg-vantage-surface p-3"
                  trigger={
                    <>
                      <span className="text-xs font-medium text-vantage-alert">See the formula</span>
                      <ChevronIcon open={formulaOpen} />
                    </>
                  }
                >
                  <div className="mt-3 border-t border-vantage-border pt-3">
                    <p className="overflow-x-auto rounded-md bg-vantage-raised px-3 py-2 font-mono text-[11px] leading-relaxed text-vantage-text">
                      No-vig probability = implied probability / total implied probability of both
                      outcomes
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-vantage-textDim">
                      This helps remove some of the built-in pricing cushion.
                    </p>
                  </div>
                </Accordion>
              )}

              {step.example && (
                <div className="mt-3 grid max-w-sm grid-cols-3 gap-3 rounded-lg border border-vantage-border bg-vantage-surface p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-vantage-textDim">
                      Market price
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-vantage-text">42¢</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-vantage-textDim">
                      Est. value
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-vantage-text">49¢</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-vantage-textDim">
                      Advantage
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-vantage-positive">+7¢</p>
                  </div>
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </ol>

      <div className="rounded-xl border border-vantage-border bg-vantage-surface p-5">
        <h3 className="text-sm font-semibold text-vantage-text">We compare like with like.</h3>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-vantage-textDim">
          A player&apos;s points prop is never compared with a game moneyline, and a 24.5 line is
          never treated as the same as a 25.5 line.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 py-2">
            <CheckIcon />
            <span className="text-xs text-vantage-text">Points prop (24.5) vs. points prop (24.5)</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 py-2">
            <XIcon />
            <span className="text-xs text-vantage-text">Points prop (24.5) vs. moneyline</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-vantage-accentEnd/40 bg-vantage-raised p-5">
        <h3 className="text-sm font-semibold text-vantage-text">Analysis, not certainty.</h3>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-vantage-textDim">
          Market prices can change, information can be incomplete, and an estimated price
          advantage does not guarantee an outcome.
        </p>
      </div>
    </div>
  )
}
