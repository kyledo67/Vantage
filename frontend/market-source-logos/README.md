# Market-source logo collection

This folder collects the requested logo assets for Vantage prototypes and source-identification UI.

## Folders

- `official/fanduel/` — extracted from Flutter's official FanDuel logo pack.
- `official/polymarket/` — extracted from Polymarket's official logo pack.
- `source-packs/` — the original downloaded ZIP files, retained for provenance.
- `logos/` — convenient PNG assets for the requested sportsbooks and prediction markets.
- `fallback-icons/` — small site icons for sources without a publicly downloadable logo pack in this pass.

## Sources and usage

| Brand | Preferred asset | Source |
| --- | --- | --- |
| FanDuel | `official/fanduel/` | Flutter's official FanDuel logo pack |
| Polymarket | `official/polymarket/` | Polymarket's official logo pack |
| DraftKings, Pinnacle, BetMGM, Caesars, Kalshi | `logos/*.png` | Public bookmaker-image endpoint surfaced by odds-api.net |
| Fanatics, PrizePicks, Underdog | `logos/*.png` | Public site favicon fallback |

Use third-party marks only to identify the relevant data source. Do not alter, recolor, imply endorsement, or use them in marketing without confirming each owner's brand guidelines and permissions. Prefer the official FanDuel and Polymarket files whenever those brands appear.

This is a curated starter set—not a claim that it contains every sportsbook worldwide. Add operators from the active data feed as needed, using an official brand pack or a licensed logo provider.
