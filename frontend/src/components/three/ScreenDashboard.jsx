// Rendered into the laptop's display via drei <Html transform>. Fixed pixel size —
// LaptopScene maps it onto the screen plane with an exact world-unit scale.
// Purple = brand/selected states. Green = live + positive-value data only.
//
// Deliberately NOT using the app's text-xs/text-sm/text-base utilities: those
// were centralized to a much larger scale for the real (1512px+) app UI, but
// this is a miniature 600×375 mockup of that same screen. Reusing the real
// scale here made every row far taller than it looks in the actual app, so
// the table overflowed its box and only the first row was ever visible.
// Everything below uses its own small, purpose-built arbitrary sizes instead,
// and the copy mirrors the real Discover/EV Finder page (src/pages/EvFinderPage.jsx,
// src/components/dashboard/OpportunityRow.jsx) rather than an older layout.

const rows = [
  {
    player: 'Jayson Tatum',
    selection: 'Over 28.5 points',
    event: 'BOS at NYK',
    market: 'Player Prop',
    platform: 'Kalshi',
    price: 'YES 43¢',
    estHit: '55.4%',
    recBet: '$32',
    ev: '+14.1%',
    selected: true,
  },
  {
    player: 'Juan Soto',
    selection: '2+ total bases',
    event: 'NYY at TOR',
    market: 'Player Prop',
    platform: 'Polymarket US',
    price: 'YES 38¢',
    estHit: '48.7%',
    recBet: '$28',
    ev: '+12.6%',
  },
  {
    player: 'Patrick Mahomes',
    selection: 'Over 250.5 pass yds',
    event: 'KC at BUF',
    market: 'Player Prop',
    platform: 'Kalshi',
    price: 'YES 53¢',
    estHit: '60.2%',
    recBet: '$25',
    ev: '+11.3%',
  },
  {
    player: 'Anthony Edwards',
    selection: 'Over 25.5 points',
    event: 'MIN at DEN',
    market: 'Player Prop',
    platform: 'Kalshi',
    price: 'YES 51¢',
    estHit: '56.1%',
    recBet: '$21',
    ev: '+9.8%',
  },
]

const navItems = [
  { label: 'Home' },
  { label: 'Discover', active: true },
  { label: 'My Picks' },
  { label: 'Methodology' },
]

export default function ScreenDashboard() {
  return (
    <div
      className="flex flex-col bg-vantage-bg font-sans"
      style={{ width: 600, height: 375, fontSize: 10 }}
      aria-hidden="true"
    >
      {/* Top chrome */}
      <div className="flex items-center justify-between border-b border-vantage-border bg-vantage-nav px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold tracking-[0.1em] text-vantage-text">
            <span className="text-vantage-accent">V</span>ANTAGE
          </span>
          <nav className="flex items-center gap-3.5 text-[9px]">
            {navItems.map((item) => (
              <span
                key={item.label}
                className={item.active ? 'font-medium text-vantage-text' : 'text-vantage-textDim'}
              >
                {item.label}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 rounded-full border border-vantage-border bg-vantage-surface px-2 py-1 text-[8px] text-vantage-textDim">
            Search markets
          </div>
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-vantage-raised text-[8px] font-semibold text-vantage-accent">
            AD
          </div>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between px-4 pb-1.5 pt-2.5">
        <div>
          <h3 className="text-[13px] font-semibold leading-none text-vantage-text">Opportunities</h3>
          <p className="mt-1 text-[9px] leading-tight text-vantage-textDim">
            Market signals priced below broader consensus.
          </p>
        </div>
        <span className="flex items-center gap-1 text-[9px] text-vantage-positive">
          <span className="h-1 w-1 rounded-full bg-vantage-positive" />
          Live · updated 12s ago
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-4 pb-2">
        {['All', 'NBA', 'NFL', 'MLB', 'NHL', 'WNBA'].map((chip, i) => (
          <span
            key={chip}
            className={`rounded px-1.5 py-1 text-[8px] ${
              i === 0
                ? 'bg-vantage-accent/20 font-medium text-vantage-accent ring-1 ring-vantage-accent/40'
                : 'bg-vantage-surface text-vantage-textDim ring-1 ring-vantage-border'
            }`}
          >
            {chip}
          </span>
        ))}
        <span className="ml-auto rounded px-1.5 py-1 text-[8px] text-vantage-textDim ring-1 ring-vantage-border">
          Sort: highest EV
        </span>
      </div>

      {/* Table */}
      <div className="mx-4 flex-1 overflow-hidden rounded-lg border border-vantage-border bg-vantage-surface">
        <div className="grid grid-cols-[1.7fr_0.9fr_0.9fr_0.6fr_0.55fr_0.55fr_0.5fr] gap-1.5 border-b border-vantage-border px-3 py-1.5 text-[8px] font-medium uppercase tracking-wide text-vantage-textDim">
          <span>Event / Selection</span>
          <span>Market</span>
          <span>Platform</span>
          <span>Price</span>
          <span>Est. hit</span>
          <span>Rec. bet</span>
          <span className="text-right">EV</span>
        </div>

        {rows.map((row) => (
          <div
            key={row.player}
            className={`grid grid-cols-[1.7fr_0.9fr_0.9fr_0.6fr_0.55fr_0.55fr_0.5fr] items-center gap-1.5 border-b border-vantage-border/60 px-3 py-1.5 last:border-b-0 ${
              row.selected ? 'border-l-2 border-l-vantage-accent bg-vantage-raised' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-3 w-3 flex-shrink-0 rounded-full bg-vantage-surfaceAlt ring-1 ring-vantage-border" />
              <div className="min-w-0">
                <div className="truncate text-[9px] font-medium leading-tight text-vantage-text">
                  {row.player}
                </div>
                <div className="truncate text-[8px] leading-tight text-vantage-textDim">
                  {row.selection} · {row.event}
                </div>
              </div>
            </div>
            <span className="truncate text-[8px] text-vantage-textDim">{row.market}</span>
            <span className="truncate text-[8px] text-vantage-textDim">{row.platform}</span>
            <span className="truncate text-[9px] font-medium text-vantage-text">{row.price}</span>
            <span className="truncate text-[9px] font-semibold text-vantage-positive">{row.estHit}</span>
            <span className="truncate text-[9px] text-vantage-text">{row.recBet}</span>
            <span className="text-right text-[9px] font-semibold text-vantage-positive">{row.ev}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-1.5 text-[8px] text-vantage-textDim">
        Estimates only · not investment advice · Vantage does not place trades
      </div>
    </div>
  )
}
