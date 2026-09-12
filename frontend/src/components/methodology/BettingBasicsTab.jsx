import { useMemo, useState } from 'react'
import Accordion from './Accordion.jsx'
import { ChevronIcon, SearchIcon, TermIcon } from './icons.jsx'

const GLOSSARY = [
  {
    id: 'odds',
    term: 'Odds',
    definition:
      'A price that reflects how likely an outcome is believed to be. Odds also determine a potential payout.',
  },
  {
    id: 'american-odds',
    term: 'American odds',
    definition: 'A common odds format in the United States.',
    details: [
      '+150 means a successful $100 stake would earn $150 in profit.',
      '-120 means a $120 stake would earn $100 in profit.',
    ],
  },
  {
    id: 'player-prop',
    term: 'Player prop',
    definition: 'A market about a specific player statistic, such as points, assists, or total bases.',
  },
  {
    id: 'over-under',
    term: 'Over / Under',
    definition:
      'A choice about whether a player or team will finish above or below a stated number. For example: Over 24.5 points.',
  },
  {
    id: 'market-price',
    term: 'Market price',
    definition: 'The current price available for an outcome or contract.',
  },
  {
    id: 'implied-probability',
    term: 'Implied probability',
    definition: 'The likelihood suggested by a market price or set of odds.',
  },
  {
    id: 'ev',
    term: 'Expected value (EV)',
    definition:
      "A way to estimate whether the price offered may be better or worse than the broader market's estimate. EV is an estimate, not a prediction.",
  },
  {
    id: 'clv',
    term: 'Closing line value (CLV)',
    definition:
      "The difference between the price someone took and the market's final price when that market closes.",
    details: [
      'It asks: did you get a better price before the market moved? Positive CLV does not guarantee a winning outcome.',
    ],
  },
  {
    id: 'price-advantage',
    term: 'Price advantage',
    definition: "The difference between the current available price and Vantage's estimated market value.",
  },
  {
    id: 'confidence',
    term: 'Confidence',
    definition: 'A simple indicator of how current and complete the supporting market information is.',
  },
]

function GlossaryRow({ term }) {
  const [open, setOpen] = useState(false)
  const hasDetails = term.details?.length > 0

  const label = (
    <span className="flex min-w-0 items-start gap-4">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-vantage-raised text-vantage-accent">
        <TermIcon />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-medium leading-tight text-vantage-text">{term.term}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-vantage-textDim">
          {term.definition}
        </span>
      </span>
    </span>
  )

  if (!hasDetails) {
    return (
      <li className="min-h-[100px] rounded-xl border border-vantage-border bg-vantage-surface px-5 py-5">
        {label}
      </li>
    )
  }

  return (
    <li className="min-h-[100px] rounded-xl border border-vantage-border bg-vantage-surface px-5 py-5">
      <Accordion
        open={open}
        onToggle={() => setOpen((current) => !current)}
        trigger={
          <>
            {label}
            <ChevronIcon open={open} />
          </>
        }
      >
        <ul className="ml-12 mt-2.5 flex flex-col gap-2.5 border-l border-vantage-border pl-4">
          {term.details.map((detail) => (
            <li key={detail} className="text-sm leading-relaxed text-vantage-textDim">
              {detail}
            </li>
          ))}
        </ul>
      </Accordion>
    </li>
  )
}

export default function BettingBasicsTab() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GLOSSARY
    return GLOSSARY.filter(
      (item) => item.term.toLowerCase().includes(q) || item.definition.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-vantage-accentEnd/40 bg-vantage-raised p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-vantage-alert">Start here</p>
        <p className="mt-2 text-base font-medium text-vantage-text">
          Odds → Implied Probability → EV → Edge
        </p>
      </div>

      <label className="relative block max-w-sm">
        <span className="sr-only">Search betting terms</span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vantage-textDim" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search betting terms"
          className="h-14 w-full rounded-full border border-vantage-border bg-vantage-surface pl-12 pr-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-base text-vantage-textDim">
          No terms match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((term) => (
            <GlossaryRow key={term.id} term={term} />
          ))}
        </ul>
      )}
    </div>
  )
}
