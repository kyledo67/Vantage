# Vantage Backend API

This document describes the Django REST API currently implemented in `backend/`.
It also records which upstream services the backend calls and which integrations are
configured but not implemented yet.

## Local base URL

```text
http://127.0.0.1:8000/api
```

React should call only these Django endpoints. API keys for ParlayAPI, Persona, and
other providers must remain in `backend/.env` and must never be sent to the browser.

All request and response bodies use JSON unless stated otherwise.

## Authentication

`/profile/` requires a Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
```

Django validates the token by calling Supabase Auth's `/auth/v1/user` endpoint with
the configured Supabase publishable key. The returned Supabase user UUID becomes the
profile `uid`. A client cannot select another user's UID in the request body or URL.

The health, opportunity, opportunity-detail, and filter endpoints currently contain
public market information and do not require authentication.

## Health

### `GET /api/health/`

Reports whether the Django process has configuration values for its integrations.
This endpoint does not make a live request to every provider.

#### Inputs

None.

#### Response — `200 OK`

```json
{
  "status": "ok",
  "integrations": {
    "nessie": false,
    "persona": true,
    "parlay_api": true,
    "kalshi": true,
    "polymarket": true,
    "supabase": true
  }
}
```

| Field | Purpose |
| --- | --- |
| `integrations.nessie` | `true` when `NESSIE_API_KEY` has a value. |
| `integrations.persona` | `true` when both the Persona API key and template ID have values. |
| `integrations.parlay_api` | `true` when `PARLAY_API_KEY` has a value. |
| `integrations.kalshi` | `true` when the public Kalshi base URL is configured. |
| `integrations.polymarket` | `true` when the public Polymarket Gamma base URL is configured. |
| `integrations.supabase` | `true` when the Supabase project URL has a value. |

## Current user profile

The profile stores user-selected prediction-market preferences and risk settings.
Persona controls age-verification fields. The API does not expose a user's exact age
or date of birth.

### `POST /api/profile/`

Creates a profile for the authenticated Supabase user.

#### Headers

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

#### Input

```json
{
  "markets": "both",
  "bankroll": "500.00",
  "max_position_percent": "5.00"
}
```

| Field | Type | Required | Accepted values and purpose |
| --- | --- | --- | --- |
| `markets` | string | No | `kalshi`, `polymarket`, or `both`. Defaults to `both`. |
| `bankroll` | decimal string | No | Non-negative amount the user has allocated to prediction markets. Defaults to `0.00`. |
| `max_position_percent` | decimal string | No | Maximum percentage of bankroll for one opportunity, from `0` through `100`. Defaults to `5.00`. |

The API ignores client attempts to set `uid`, `is_age_verified`, or
`verification_status`. Those are server-controlled fields.

#### Response — `201 Created`

```json
{
  "uid": "11111111-1111-1111-1111-111111111111",
  "is_age_verified": false,
  "verification_status": "not_started",
  "markets": "both",
  "bankroll": "500.00",
  "max_position_percent": "5.00",
  "created_at": "2026-09-12T05:00:00Z",
  "updated_at": "2026-09-12T05:00:00Z"
}
```

#### Errors

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | A field is invalid, negative, or outside its allowed choices. |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |
| `409 Conflict` | A profile already exists for this user. Use `PATCH` instead. |

### `GET /api/profile/`

Returns the authenticated user's profile.

#### Inputs

No query or body input. Requires the Supabase access-token header.

#### Response — `200 OK`

The response has the same shape as the `POST /api/profile/` response.

#### Errors

| Status | Meaning |
| --- | --- |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |
| `404 Not Found` | The authenticated user has not created a profile. |

### `PATCH /api/profile/`

Updates selected fields on the authenticated user's profile.

#### Input

Send any subset of the editable fields:

```json
{
  "markets": "kalshi",
  "bankroll": "650.00"
}
```

Editable fields are `markets`, `bankroll`, and `max_position_percent`.

#### Response — `200 OK`

Returns the complete updated profile.

#### Errors

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | An editable field contains an invalid value. |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |
| `404 Not Found` | The authenticated user has not created a profile. |

## +EV opportunity finder

The finder reads executable target asks directly from Kalshi and Polymarket and asks
ParlayAPI for the corresponding sportsbook and exchange references. Supported target
markets include player props, moneylines, spreads, game totals, team totals,
both-teams-to-score, and EPL total corners. Django matches equivalent markets, removes
each reference source's margin, builds a weighted fair probability, and calculates EV
against the target ask. ParlayAPI's `/ev` route uses a single configurable sharp
anchor, so the finder keeps its broader weighted consensus calculation.

Only opportunities with estimated net EV greater than `0%` are returned. The default
does not hide opportunities below `+3%`.

### `GET /api/opportunities/`

Returns the current ranked opportunity feed.

#### Query inputs

```text
GET /api/opportunities/?category=americanfootball_nfl&platform=kalshi&market_type=player_prop&min_ev=1&search=mahomes&refresh=true
```

| Parameter | Required | Example | Purpose |
| --- | --- | --- | --- |
| `category` | No | `americanfootball_nfl` | Restricts results to one configured sport. |
| `platform` | No | `kalshi` | `kalshi` or `polymarket`. |
| `market_type` | No | `player_prop` | `player_prop`, `game_prop`, or `game_market`. |
| `min_ev` | No | `1` | Minimum net EV percentage. Defaults to `0`. Negative-EV results are never returned. |
| `search` | No | `mahomes` | Case-insensitive search across event, selection, market, and platform names. |
| `refresh` | No | `true` | Fetches new ParlayAPI references and direct Kalshi/Polymarket asks. Omit it when changing filters so no credits are spent. |

Configured category values are currently:

```text
baseball_mlb
americanfootball_nfl
basketball_nba
icehockey_nhl
basketball_wnba
soccer_epl
```

#### Response — `200 OK`

```json
{
  "live": {
    "isLive": true,
    "updatedAt": "2026-09-12T05:00:00+00:00",
    "source": "ParlayAPI + Kalshi + Polymarket",
    "sportsLoaded": ["baseball_mlb", "americanfootball_nfl"],
    "sportsFailed": []
  },
  "results": [
    {
      "id": "kalshi-1234567890abcdef1234",
      "selection": {
        "title": "Josh Allen — Over",
        "subtitle": "Buffalo Bills @ Houston Texans",
        "tags": ["NFL"]
      },
      "market": {
        "title": "Passing Yards",
        "subtitle": "Over 265.5"
      },
      "platform": {
        "name": "Kalshi"
      },
      "price": {
        "label": "27.0¢ · +270",
        "odds": 270,
        "oddsLabel": "+270",
        "source": "Kalshi"
      },
      "consensus": {
        "label": "28.8%",
        "sourceCount": 4,
        "sources": ["Pinnacle", "FanDuel", "Novig", "Bovada"]
      },
      "ev": {
        "label": "+5.5%",
        "value": 5.5,
        "isPositive": true
      },
      "hasDetail": true
    }
  ]
}
```

| Response field | Purpose |
| --- | --- |
| `live` | Reports when the current snapshot was fetched. `isLive` is false when one or more configured sports failed to refresh. |
| `id` | Stable hash of the platform, event, market, line, and selection. Use it for the detail route. |
| `price.label` | Frontend-ready target price with probability-style cents and American odds. |
| `price.odds` | Numeric American odds from the target platform. |
| `price.source` | Identifies whether the target odds came from Kalshi or Polymarket. |
| `consensus.label` | Weighted, no-vig probability across matched reference books. |
| `consensus.sources` | Names of the books that contributed to this result. |
| `ev.value` | Estimated net expected return percentage after the configured cost allowance. |

#### Errors

| Status | Meaning |
| --- | --- |
| `503 Service Unavailable` | ParlayAPI is unavailable, rejects the key, exhausts its credits, or no configured sport can be refreshed. |

## Opportunity details

### `GET /api/opportunities/{id}/detail/`

Returns the book-by-book evidence behind one opportunity. Use the `id` returned by
`GET /api/opportunities/`.

#### Inputs

| Input | Location | Purpose |
| --- | --- | --- |
| `id` | URL path | Identifies the opportunity in the current cached snapshot. |

#### Response — `200 OK`

```json
{
  "sources": [
    {
      "id": "pinnacle",
      "name": "Pinnacle",
      "priceLabel": "-150",
      "odds": -150,
      "fairProbability": 0.582,
      "weight": 5.0,
      "subLabel": "58.2% no-vig · 5× weight"
    },
    {
      "id": "fanduel",
      "name": "FanDuel",
      "priceLabel": "-140",
      "odds": -140,
      "fairProbability": 0.568,
      "weight": 4.0,
      "subLabel": "56.8% no-vig · 4× weight"
    }
  ],
  "target": {
    "name": "Kalshi",
    "priceCents": 50.0,
    "odds": 100,
    "oddsLabel": "+100"
  },
  "signal": {
    "label": "Estimated value gap",
    "percent": 57.6,
    "leftLabel": "Market 50.0%",
    "rightLabel": "Fair 57.6%"
  },
  "stats": [
    {
      "label": "Price advantage",
      "value": "+7.6 pts",
      "isPositive": true
    },
    {
      "label": "Estimated EV after costs",
      "value": "+14.2%",
      "isPositive": true
    },
    {
      "label": "Target quote",
      "value": "Kalshi +100",
      "isPositive": false
    },
    {
      "label": "Consensus sources",
      "value": "2",
      "isPositive": false
    }
  ],
  "updatedAt": "2026-09-12T05:00:00Z",
  "sourceUrl": "https://kalshi.com/events/example",
  "disclaimer": "Informational estimate. Prices change and results are not guaranteed."
}
```

Each item in `sources` identifies the sportsbook, its American odds, that book's
individual no-vig probability, and its consensus weight.

#### Errors

| Status | Meaning |
| --- | --- |
| `404 Not Found` | The ID is not present in the current cached snapshot. Refresh the opportunity list. |
| `503 Service Unavailable` | Live market data could not be loaded. |

## Filter configuration

### `GET /api/filters/`

Returns the categories and dropdown options used by the EV Finder. The frontend uses
this route instead of hardcoding the controls.

#### Inputs

None.

#### Response — `200 OK`

```json
{
  "categories": [
    {"id": "", "label": "All"},
    {"id": "baseball_mlb", "label": "MLB"},
    {"id": "americanfootball_nfl", "label": "NFL"}
  ],
  "filters": [
    {
      "id": "platform",
      "label": "All platforms",
      "options": [
        {"value": "kalshi", "label": "Kalshi"},
        {"value": "polymarket", "label": "Polymarket"}
      ]
    },
    {
      "id": "market_type",
      "label": "All market types",
      "options": [
        {"value": "player_prop", "label": "Player props"},
        {"value": "game_prop", "label": "Game props"},
        {"value": "game_market", "label": "Game markets"}
      ]
    },
    {
      "id": "min_ev",
      "label": "Minimum EV",
      "options": [
        {"value": "0", "label": "All +EV"},
        {"value": "1", "label": "+1% or better"},
        {"value": "3", "label": "+3% or better"},
        {"value": "5", "label": "+5% or better"},
        {"value": "10", "label": "+10% or better"}
      ]
    }
  ]
}
```

## EV calculation

For every Kalshi or Polymarket outcome, the backend:

1. Matches the same sport, event, market, exact line, and side. Player props also
   require the same player and statistic.
2. Requires a complete two-sided reference market so its margin can be removed.
3. Converts each American price into implied probability.
4. Divides the selected probability by the sum of all probabilities in that book's
   matched market to create a no-vig probability.
5. Requires at least one sharp anchor and combines all available no-vig probabilities
   with the weights below.
6. Calculates gross EV as `fair_probability × target_decimal_odds - 1`.
7. Subtracts `MARKET_DATA_COST_ALLOWANCE_PERCENT`, currently `1` percentage point.
8. Returns the opportunity only when the resulting net EV is greater than zero.

### Consensus weights

| Source | Weight |
| --- | ---: |
| Pinnacle | 5.0 |
| FanDuel | 4.0 |
| Novig | 3.5 |
| ProphetX | 3.5 |
| Bookmaker.eu | 3.0 |
| Bet365 | 2.5 |
| Bovada | 2.5 |
| BetOnline | 2.5 |
| DraftKings | 2.0 |
| BetMGM | 2.0 |
| Caesars | 2.0 |
| BetRivers / Fanatics | 2.0 |
| Fliff / Hard Rock / Parx / Unibet / 10bet | 1.5 |
| Underdog | 1.0 |
| PrizePicks | 1.0 |
| Other prediction market | 0.75 |

A source is omitted when it has no exact equivalent prop or no usable two-sided
price. ParlayAPI normalizes applicable DFS rows before the backend removes the
displayed two-sided margin.

## Live-data behavior

- The first opportunity request after a backend restart fetches one player-props
  snapshot and one game-odds snapshot for each configured sport.
- Changing filters reads the current Django snapshot and does not spend API credits.
- `refresh=true` fetches new ParlayAPI references and direct Kalshi/Polymarket target
  asks, then completely replaces the previous snapshot.
- The ParlayAPI request uses `maxAgeSec` so rows older than the configured freshness
  bound are excluded. The default bound is 300 seconds to accommodate the current
  Kalshi refresh cadence.
- Because snapshots are replaced rather than merged, a moved or withdrawn Kalshi or
  Polymarket line is updated or removed on refresh.
- Game opportunities require a complete two-sided target market and an upcoming
  event. This prevents a one-sided season/futures contract from being compared with
  an individual game's moneyline, spread, or total.
- The frontend provides a **Refresh odds** button that sends `refresh=true`; there is
  no timer, cron job, WebSocket, or background polling loop.
- A provider failure returns an error state rather than mock market prices.
- Opportunity IDs and detail data exist in the current snapshot. An ID for a removed
  or changed target line returns `404` after refresh.

These values are configurable with backend environment variables.

## External services

### ParlayAPI — implemented

Base URL:

```text
https://parlay-api.com/v1
```

Authentication:

```http
X-API-Key: <PARLAY_API_KEY>
```

Current calls:

```text
GET /sports/{sport}/props
GET /sports/{sport}/odds
```

Both requests ask for all configured reference sources in American-odds format. The
props request includes event-market rows, caps row age with `maxAgeSec`, and allows up
to 10,000 rows. The game-odds request includes moneylines, spreads, and totals with
current-line verification metadata. The backend calculates weighted consensus EV from
these normalized responses instead of calling the single-anchor `/ev` route.

The requested SmartStake sources Bet105, BetCris, Bracco, Coolbet, Heritage Sports,
JazzSports, JustBet, and Prime Sports are not exposed by ParlayAPI's current bookmaker
catalog. Bodog is not exposed as a separate source either, so only the available
`bovada` feed is counted instead of inventing a duplicate reference price.

Documentation: <https://parlay-api.com/docs>

### Supabase Auth — implemented for profile routes

Current call:

```text
GET {SUPABASE_URL}/auth/v1/user
```

The backend forwards the user's bearer access token and the Supabase publishable key.

Documentation: <https://supabase.com/docs/guides/auth/jwts>

### Kalshi public API — implemented

Configured base URL:

```text
https://api.elections.kalshi.com/trade-api/v2
```

Current call, repeated for the configured sport's supported series:

```text
GET /events?series_ticker={ticker}&status=open&with_nested_markets=true
```

The finder reads `yes_ask_dollars` and `no_ask_dollars`, because an ask is the price a
user can execute. It excludes Kalshi multivariate/parlay contracts from direct EV
matching. Current direct series cover game winners, spreads, game totals, team totals,
EPL both-teams-to-score, and EPL total corners.

Documentation: <https://docs.kalshi.com/api-reference/market/get-market>

### Polymarket public APIs — implemented for discovery and executable asks

Configured base URLs:

```text
https://gamma-api.polymarket.com
https://clob.polymarket.com
```

Current call, repeated for the configured league series:

```text
GET /events?series_id={id}&active=true&closed=false
```

The finder uses Gamma's `bestAsk` for the first outcome and the complementary price of
`bestBid` for the opposite outcome. It requires both sides to be available and ignores
closed, inactive, unmatched, and already-started markets. No wallet or trading
credentials are collected.

Documentation: <https://docs.polymarket.com/market-data/overview>

### Persona — configuration and database fields only

Configured base URL:

```text
https://api.withpersona.com/api/v1
```

The user profile table has `persona_inquiry_id`, `verification_status`, and
`is_age_verified`. Inquiry creation and webhook endpoints have not been implemented.

### Capital One Nessie — waiting on provider access

The base URL and API-key environment variables exist, but no Nessie route or client is
implemented because the provider API is currently unavailable to the project.

## Environment variables

The following variable names are used by the current API. Do not place their values in
documentation or commit `backend/.env`.

```text
DJANGO_SECRET_KEY
DATABASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
PARLAY_API_KEY
PARLAY_API_BASE_URL
KALSHI_API_BASE_URL
POLYMARKET_GAMMA_API_BASE_URL
POLYMARKET_CLOB_API_BASE_URL
PERSONA_API_KEY
PERSONA_INQUIRY_TEMPLATE_ID
PERSONA_API_BASE_URL
NESSIE_API_KEY
NESSIE_API_BASE_URL
CORS_ALLOWED_ORIGINS
```

Optional market-data settings:

```text
MARKET_DATA_SPORTS
MARKET_DATA_BOOKMAKERS
MARKET_DATA_MAX_AGE_SECONDS
MARKET_DATA_PROP_LIMIT
MARKET_DATA_REQUEST_TIMEOUT_SECONDS
MARKET_DATA_MIN_EV_PERCENT
MARKET_DATA_COST_ALLOWANCE_PERCENT
```

## Routes not implemented yet

The frontend contains service placeholders for additional routes, but the backend does
not currently provide them:

```text
GET /api/opportunities/{id}/
GET /api/account/
GET /api/sports/
GET /api/market-health/
GET /api/data-freshness/
GET /api/markets/
GET /api/markets/{id}/
```

Watchlists, alerts, history, parlays, Persona inquiry/webhook processing, and Gemini
explanations also do not have backend endpoints yet.
