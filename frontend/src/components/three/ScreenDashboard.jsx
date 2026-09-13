// Rendered into the laptop's display via drei <Html transform>. Fixed pixel size —
// LaptopScene maps it onto the screen plane with an exact world-unit scale.
// Purple = brand/selected states. Green = live + positive-value data only.

const rows = [
  {
    player: 'Jayson Tatum',
    selection: 'Over 28.5 points',
    event: 'BOS at NYK',
    time: 'Today 7:30 PM',
    platform: 'Kalshi',
    price: 'YES 43¢',
    consensus: '55.4%',
    ev: '+14.1%',
    selected: true,
  },
  {
    player: 'Juan Soto',
    selection: '2+ total bases',
    event: 'NYY at TOR',
    time: 'Today 7:05 PM',
    platform: 'Polymarket US',
    price: 'YES 38¢',
    consensus: '48.7%',
    ev: '+12.6%',
  },
  {
    player: 'Patrick Mahomes',
    selection: 'Over 250.5 pass yds',
    event: 'KC at BUF',
    time: 'Sun 3:25 PM',
    platform: 'Kalshi',
    price: 'YES 53¢',
    consensus: '60.2%',
    ev: '+11.3%',
  },
  {
    player: 'Anthony Edwards',
    selection: 'Over 25.5 points',
    event: 'MIN at DEN',
    time: 'Today 9:00 PM',
    platform: 'Kalshi',
    price: 'YES 51¢',
    consensus: '56.1%',
    ev: '+9.8%',
  },
  {
    player: 'Caitlin Clark',
    selection: 'Over 7.5 assists',
    event: 'IND at CHI',
    time: 'Today 7:00 PM',
    platform: 'Kalshi',
    price: 'YES 46¢',
    consensus: '51.8%',
    ev: '+9.5%',
  },
]

export default function ScreenDashboard() {
  return (
    <div
      className="flex flex-col bg-vantage-bg font-sans"
      style={{ width: 600, height: 375 }}
      aria-hidden="true"
    >
      {/* Top chrome */}
      <div className="flex items-center justify-between border-b border-vantage-border bg-vantage-nav px-5 py-2.5">
        <div className="flex items-center gap-6">
          <span className="text-xs font-semibold tracking-tight text-vantage-text">
            <span className="text-vantage-accent">V</span>antage
          </span>
          <nav className="flex items-center gap-5 text-xs">
            <span className="border-b-2 border-vantage-accent pb-0.5 font-medium text-vantage-text">
              Discover
            </span>
            <span className="text-vantage-textDim">Watchlist</span>
            <span className="text-vantage-textDim">Markets</span>
            <span className="text-vantage-textDim">History</span>
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-28 rounded-full border border-vantage-border bg-vantage-surface px-2.5 py-1.5 text-xs text-vantage-textDim">
            Search markets
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-vantage-raised text-xs font-semibold text-vantage-accent">
            AD
          </div>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between px-5 pb-2.5 pt-4">
        <div>
          <h3 className="text-base font-semibold leading-none text-vantage-text">Opportunities</h3>
          <p className="mt-1.5 text-xs text-vantage-textDim">
            Prediction markets priced below the broader sportsbook consensus.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-vantage-positive">
          <span className="h-1 w-1 rounded-full bg-vantage-positive" />
          Live · updated 12s ago
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 px-5 pb-2.5">
        {['All', 'NBA', 'NFL', 'MLB', 'NHL', 'WNBA'].map((chip, i) => (
          <span
            key={chip}
            className={`rounded-md px-2.5 py-1.5 text-xs ${
              i === 0
                ? 'bg-vantage-accent/20 font-medium text-vantage-accent ring-1 ring-vantage-accent/40'
                : 'bg-vantage-surface text-vantage-textDim ring-1 ring-vantage-border'
            }`}
          >
            {chip}
          </span>
        ))}
        <span className="ml-auto rounded-md bg-vantage-surface px-2.5 py-1.5 text-xs text-vantage-textDim ring-1 ring-vantage-border">
          Sort: highest EV
        </span>
      </div>

      {/* Table */}
      <div className="mx-5 flex-1 overflow-hidden rounded-lg border border-vantage-border bg-vantage-surface">
        <div className="grid grid-cols-[1.9fr_1.1fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-2.5 border-b border-vantage-border px-4 py-2 text-sm uppercase tracking-wide text-vantage-textDim">
          <span>Event / Selection</span>
          <span>Market</span>
          <span>Platform</span>
          <span>Price</span>
          <span>Consensus</span>
          <span className="text-right">EV</span>
        </div>

        {rows.map((row) => (
          <div
            key={row.player}
            className={`grid grid-cols-[1.9fr_1.1fr_0.8fr_0.7fr_0.7fr_0.6fr] items-center gap-2.5 border-b border-vantage-border/60 px-4 py-[7px] ${
              row.selected ? 'border-l-2 border-l-vantage-accent bg-vantage-raised' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 flex-shrink-0 rounded-full bg-vantage-surfaceAlt ring-1 ring-vantage-border" />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-vantage-text">{row.player}</div>
                <div className="truncate text-xs text-vantage-textDim">{row.selection}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs text-vantage-text">{row.event}</div>
              <div className="truncate text-xs text-vantage-textDim">{row.time}</div>
            </div>
            <span className="truncate text-xs text-vantage-textDim">{row.platform}</span>
            <span className="text-xs font-medium text-vantage-text">{row.price}</span>
            <span className="text-xs text-vantage-text">{row.consensus}</span>
            <span className="text-right text-xs font-semibold text-vantage-positive">
              {row.ev}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 py-2.5 text-xs text-vantage-textDim">
        Estimates only · not investment advice · Vantage does not place trades
      </div>
    </div>
  )
}
