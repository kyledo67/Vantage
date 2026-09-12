import { motion } from 'framer-motion'

// Static, illustrative preview for the auth screen — not wired to live data.
const previewRows = [
  { player: 'Jayson Tatum — Over 28.5 Points', price: 'YES 43¢', roi: '+14.1%', live: true },
  { player: 'Caitlin Clark — Over 7.5 Assists', price: 'YES 46¢', roi: '+9.5%', live: false },
]

export default function LiveOpportunitiesPreview() {
  return (
    <div className="rounded-xl border border-vantage-border bg-vantage-surface/80 p-5 backdrop-blur">
      <div className="flex items-center justify-between px-1.5 pb-4">
        <span className="text-sm font-medium uppercase tracking-wide text-vantage-textDim">
          Today's opportunities
        </span>
        <span className="flex items-center gap-2 text-xs font-semibold text-vantage-positive">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vantage-positive opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-vantage-positive" />
          </span>
          Live
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {previewRows.map((row) => (
          <div
            key={row.player}
            className="flex items-center justify-between gap-4 rounded-lg bg-vantage-surfaceAlt px-4 py-2.5"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  row.live ? 'bg-vantage-accent' : 'bg-vantage-borderLight'
                }`}
              />
              <span className="truncate text-xs font-medium text-vantage-text">{row.player}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-4 text-xs">
              <span className="text-vantage-textDim">{row.price}</span>
              <span className="font-semibold text-vantage-positive">{row.roi}</span>
            </div>
          </div>
        ))}

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-vantage-surfaceAlt">
          <motion.div
            className="h-full rounded-full bg-vantage-hero"
            initial={{ width: '15%' }}
            animate={{ width: ['15%', '65%', '15%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  )
}
