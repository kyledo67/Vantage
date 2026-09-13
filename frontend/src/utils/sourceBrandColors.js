// Per-source brand colors, sampled from each source's own logo file
// (src/assets/logos/*.png — see market-source-logos/README.md for
// provenance). Used to color-code sportsbook/exchange badges, chips, and
// legend dots throughout the app so a given source reads the same color
// everywhere instead of an arbitrary per-component palette.
//
// These are UI accent colors only, not the source's official brand mark —
// see the logo README before using them for anything beyond identification.
export const SOURCE_BRAND_COLORS = {
  FanDuel: '#1493FF',
  DraftKings: '#53D337',
  Pinnacle: '#EF4923',
  BetMGM: '#C8A96A',
  Caesars: '#C9A227',
  Fanatics: '#D8D8DC',
  PrizePicks: '#7B2FF7',
  // The source logo itself is a dark navy mark; lightened here so the text/
  // border stay legible against the app's near-black background.
  Underdog: '#5B6EF5',
  Kalshi: '#00D992',
  Polymarket: '#3B5BFF',
}

/** Brand color for a source name, or `fallback` (default vantage accent) if unrecognized. */
export function getSourceColor(name, fallback = '#CE63E9') {
  return SOURCE_BRAND_COLORS[name] ?? fallback
}

// Tailwind's JIT scanner needs literal class strings, so a per-brand hex
// can't drive arbitrary-value classes — consumers go through inline style
// (borderColor/color/background) using this instead.
export function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
