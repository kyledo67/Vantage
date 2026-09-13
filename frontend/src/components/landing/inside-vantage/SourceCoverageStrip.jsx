import fanduel from '../../../assets/logos/fanduel.png'
import draftkings from '../../../assets/logos/draftkings.png'
import pinnacle from '../../../assets/logos/pinnacle.png'
import betmgm from '../../../assets/logos/betmgm.png'
import caesars from '../../../assets/logos/caesars.png'
import fanatics from '../../../assets/logos/fanatics.png'
import prizepicks from '../../../assets/logos/prizepicks.png'
import underdog from '../../../assets/logos/underdog.png'
import kalshi from '../../../assets/logos/kalshi.png'
import polymarket from '../../../assets/logos/polymarket.png'

// Real marks, used only to identify Vantage's data sources — see
// market-source-logos/README.md in the repo root for provenance per brand.
// Not for marketing use beyond this identification context.
const sources = [
  { name: 'FanDuel', logo: fanduel },
  { name: 'DraftKings', logo: draftkings },
  { name: 'Pinnacle', logo: pinnacle },
  { name: 'BetMGM', logo: betmgm },
  { name: 'Caesars', logo: caesars },
  { name: 'Fanatics', logo: fanatics },
  { name: 'PrizePicks', logo: prizepicks },
  { name: 'Underdog', logo: underdog },
  { name: 'Kalshi', logo: kalshi },
  { name: 'Polymarket', logo: polymarket },
]

export default function SourceCoverageStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {sources.map((s) => (
        <span
          key={s.name}
          className="flex items-center gap-2.5 rounded-full border border-vantage-border py-1.5 pl-1.5 pr-4 text-sm text-vantage-textDim"
        >
          <img src={s.logo} alt="" className="h-6 w-6 flex-shrink-0 rounded-full object-cover" />
          {s.name}
        </span>
      ))}
      <span className="rounded-full border border-dashed border-vantage-border px-4 py-2 text-sm text-vantage-textDim">
        + more
      </span>
    </div>
  )
}
