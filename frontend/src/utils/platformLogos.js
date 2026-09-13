// Local fallback logos for known sportsbooks/exchanges, used wherever the
// backend hasn't supplied a platform.iconUrl / source.iconUrl yet — so a
// recognized platform gets its real mark instead of the generic colored-
// initial PlaceholderIcon. See market-source-logos/README.md for provenance.
import fanduel from '../assets/logos/fanduel.png'
import draftkings from '../assets/logos/draftkings.png'
import pinnacle from '../assets/logos/pinnacle.png'
import betmgm from '../assets/logos/betmgm.png'
import caesars from '../assets/logos/caesars.png'
import fanatics from '../assets/logos/fanatics.png'
import prizepicks from '../assets/logos/prizepicks.png'
import underdog from '../assets/logos/underdog.png'
import kalshi from '../assets/logos/kalshi.png'
import polymarket from '../assets/logos/polymarket.png'

const PLATFORM_LOGOS = {
  FanDuel: fanduel,
  DraftKings: draftkings,
  Pinnacle: pinnacle,
  BetMGM: betmgm,
  Caesars: caesars,
  Fanatics: fanatics,
  PrizePicks: prizepicks,
  Underdog: underdog,
  Kalshi: kalshi,
  Polymarket: polymarket,
  'Polymarket US': polymarket,
}

/** Local logo asset for a known platform/book name, or null if unrecognized. */
export function getPlatformLogo(name) {
  return PLATFORM_LOGOS[(name ?? '').trim()] ?? null
}
