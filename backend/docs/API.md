# Vantage Backend API

This document describes the Django REST API currently implemented in `backend/`.
It also records which upstream services the backend calls and which integrations are
configured but not implemented yet.

## Local base URL

```text
http://127.0.0.1:8000/api
```

React calls only these Django endpoints for application data. API keys for ParlayAPI,
Persona, and other private providers remain in `backend/.env`. Supabase's publishable
key is also placed in the ignored `frontend/.env`, because it is designed for browser
clients; Supabase access controls still depend on the user's session and server rules.

All request and response bodies use JSON unless stated otherwise.

## Authentication

`/profile/`, `/settings/`, and `/persona/inquiries/` require a Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
```

Django validates the token by calling Supabase Auth's `/auth/v1/user` endpoint with
the configured Supabase publishable key. The returned Supabase user UUID becomes the
profile `uid`. A client cannot select another user's UID in the request body or URL.
The `user_profiles` table has Postgres row-level security enabled with no direct client
policy; profile access goes through these authenticated Django routes.

React obtains and refreshes this token through Supabase Auth and attaches it to Django
requests automatically. The health, opportunity, opportunity-detail, filter, and
Persona webhook endpoints do not require a user session. Persona webhook requests use
their own HMAC signature instead.

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
    "persona_webhook": false,
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
| `integrations.persona_webhook` | `true` when the Persona webhook signing secret has a value. |
| `integrations.parlay_api` | `true` when `PARLAY_API_KEY` has a value. |
| `integrations.kalshi` | `true` when the public Kalshi base URL is configured. |
| `integrations.polymarket` | `true` when the public Polymarket US gateway base URL is configured. |
| `integrations.supabase` | `true` when the Supabase project URL has a value. |

## Current user profile

The profile stores user-selected prediction-market preferences and risk settings.
Persona controls age and residence-verification fields. The API does not expose a user's exact age
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
  "residence_country_code": "",
  "residence_subdivision": "",
  "eligibility": {
    "is_eligible": false,
    "is_residence_verified": false,
    "eligible_markets": [],
    "platforms": {
      "kalshi": {
        "eligible": false,
        "status": "verification_required",
        "reason": "Complete Persona identity and 18+ verification first."
      },
      "polymarket": {
        "eligible": false,
        "status": "verification_required",
        "reason": "Complete Persona identity and 18+ verification first."
      }
    },
    "policy_checked_on": "2026-09-12"
  },
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

Returns the authenticated user's profile. If this is the user's first authenticated
request, Django creates the profile with safe defaults before returning it.

#### Inputs

No query or body input. Requires the Supabase access-token header.

#### Response — `200 OK`

The response has the same shape as the `POST /api/profile/` response.

#### Errors

| Status | Meaning |
| --- | --- |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |

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

## Settings

### `GET /api/settings/`

Returns the authenticated user's account, verification state, prediction-market
selection, bankroll, and maximum-position preference in the section/field structure
consumed by the React Settings page. The profile is created automatically when absent.

The email comes from the verified Supabase session. Persona controls
`verification_status`, `is_age_verified`, `residence_country_code`, and
`residence_subdivision`; all are read-only. The response also gives separate Kalshi
and Polymarket US eligibility pre-screens. These combine Persona approval with the
current platform residence rules and do not replace either platform's own onboarding
or live physical-location checks.

### `PATCH /api/settings/`

Updates one editable setting.

```json
{
  "fieldId": "bankroll",
  "value": "750.00"
}
```

Accepted `fieldId` values are `markets`, `bankroll`, and
`max_position_percent`. The response contains the complete updated `sections` object.
Attempts to update email or verification fields return `400 Bad Request`.

## Persona verification

### `POST /api/persona/inquiries/`

Gets or creates an inquiry for the authenticated Supabase UUID. If an existing inquiry
is pending, Django asks Persona for a short-lived resume token. The React app passes the
returned values into Persona's embedded web SDK.

```json
{
  "inquiryId": "inq_example",
  "sessionToken": null,
  "environmentId": "env_example",
  "status": "created",
  "verified": false,
  "launchable": true
}
```

The API never accepts a user ID or Persona inquiry ID from the browser. It derives the
user from the Supabase bearer token and stores the inquiry association server side.

### `POST /api/persona/webhook/`

Receives Persona inquiry lifecycle events. This route does not use Supabase Auth. It
requires a valid `Persona-Signature` HMAC computed with `PERSONA_WEBHOOK_SECRET`, rejects
signatures older than five minutes, ignores duplicate/out-of-order events, and accepts
verification only for the configured inquiry template.

Only an `approved` Persona inquiry sets `is_age_verified=true`. Market eligibility also
requires the approved inquiry to contain `fields.address-country-code`.
Completed and review states remain pending; declined, failed, and expired states remain
unverified. The backend stores only the normalized residence country/region needed for
the pre-screen, not the user's birthdate, street address, or identity document.

The residence rules are checked in `market_data/eligibility.py`. They reflect Kalshi's
June 17, 2026 Member Agreement and Polymarket US's current U.S.-resident positioning as
of September 12, 2026. They must be reviewed when either platform changes its rules.

## +EV opportunity finder

The finder reads executable target asks directly from Kalshi and Polymarket US and asks
ParlayAPI for the corresponding sportsbook and exchange references. Supported target
markets include player props, moneylines, spreads, game totals, team totals,
both-teams-to-score, and EPL total corners. Django matches equivalent markets, removes
each reference source's margin, builds a weighted fair probability, and calculates EV
against the target ask. ParlayAPI's `/ev` route uses a single configurable sharp
anchor, so the finder keeps its broader weighted consensus calculation.

Only opportunities with estimated net EV greater than `0%` and a consensus hit
probability of at least `30%` are returned. The EV floor remains `0%`, so smaller
positive edges are still eligible when their hit probability clears the hard floor.

### `GET /api/opportunities/`

Returns the current ranked opportunity feed.

#### Query inputs

```text
GET /api/opportunities/?category=americanfootball_nfl&platform=kalshi&market_type=player_prop&min_ev=1&min_probability=30&search=mahomes&refresh=true
```

| Parameter | Required | Example | Purpose |
| --- | --- | --- | --- |
| `category` | No | `americanfootball_nfl` | Restricts results to one configured sport. |
| `platform` | No | `kalshi` | `kalshi` or `polymarket`. |
| `market_type` | No | `player_prop` | `player_prop`, `game_prop`, or `game_market`. |
| `min_ev` | No | `1` | Minimum net EV percentage. Defaults to `0`. Negative-EV results are never returned. |
| `min_probability` | No | `30` | Minimum estimated hit probability from `30` through `100`. Values below `30` are raised to the hard `30%` floor. |
| `search` | No | `mahomes` | Case-insensitive search across event, selection, market, and platform names. |
| `refresh` | No | `true` | Fetches new ParlayAPI references and direct Kalshi/Polymarket US asks. Omit it when changing filters so no credits are spent. |

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
    "source": "ParlayAPI + Kalshi + Polymarket US",
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
      "action": {
        "platform": "kalshi",
        "marketUrl": "https://kalshi.com/markets/kxnflgame",
        "comboPrefillSupported": false
      },
      "price": {
        "label": "27.0¢ · +270",
        "odds": 270,
        "oddsLabel": "+270",
        "source": "Kalshi"
      },
      "consensus": {
        "label": "28.8%",
        "probability": 0.288,
        "sourceCount": 4,
        "sources": ["Pinnacle", "FanDuel", "Novig", "Bovada"]
      },
      "ev": {
        "label": "+5.5%",
        "value": 5.5,
        "isPositive": true
      },
      "evaluation": {
        "hitProbability": 28.8,
        "hitProbabilityLabel": "28.8%",
        "missProbability": 71.2,
        "tier": "lower",
        "tierLabel": "Lower hit chance",
        "kellyPercent": 2.04,
        "quarterKellyPercent": 0.51,
        "rankScore": 2.04
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
| `action.marketUrl` | Direct Kalshi or Polymarket US market/series page used by the frontend handoff. It is an external URL and does not place an order. |
| `action.comboPrefillSupported` | Always `false` while neither platform has a documented public Combo-prefill URL or API. |
| `price.label` | Frontend-ready target price with probability-style cents and American odds. |
| `price.odds` | Numeric American odds from the target platform. |
| `price.source` | Identifies whether the target odds came from Kalshi or Polymarket US. |
| `consensus.label` | Weighted, no-vig probability across matched reference books. |
| `consensus.sources` | Names of the books that contributed to this result. |
| `ev.value` | Estimated net expected return percentage after the configured cost allowance. |
| `evaluation.hitProbability` | Consensus estimate of how often the selection wins, expressed from `0` through `100`. |
| `evaluation.tier` | Plain-language hit-chance band: `longshot`, `lower`, `moderate`, or `higher`. |
| `evaluation.kellyPercent` | Full Kelly fraction expressed as a bankroll percentage and used for default ranking. |
| `evaluation.quarterKellyPercent` | Conservative quarter-Kelly reference shown in the detail panel. |

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
      "id": "kalshi",
      "name": "Kalshi",
      "priceLabel": "+100",
      "odds": 100,
      "impliedProbability": 0.5,
      "isTarget": true,
      "includedInConsensus": false,
      "subLabel": "Target · 50.0% implied"
    },
    {
      "id": "pinnacle",
      "name": "Pinnacle",
      "priceLabel": "-150",
      "odds": -150,
      "fairProbability": 0.582,
      "weight": 5.0,
      "isTarget": false,
      "includedInConsensus": true,
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

The target platform is always the first item in `sources`. If the other prediction
platform has the exact same event, market, side, and line, its price is included too.
Every other item identifies the sportsbook, its American odds, individual no-vig
probability, consensus weight, and whether it survived the outlier check. An excluded
price remains visible for transparency but has `includedInConsensus: false` and zero
weight.

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
        {"value": "polymarket", "label": "Polymarket US"}
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

For every Kalshi or Polymarket US outcome, the backend:

1. Matches the same sport, event, market, exact line, and side. Player props also
   require the same player and statistic.
2. Requires a complete two-sided reference market so its margin can be removed.
3. Converts each American price into implied probability.
4. Divides the selected probability by the sum of all probabilities in that book's
   matched market to create a no-vig probability.
5. Requires at least two usable reference sources, including a sportsbook baseline
   led by Pinnacle, then FanDuel and the remaining primary sportsbooks. A sole
   Pinnacle reference is allowed when no second book covers that exact market.
6. Rejects incomplete or malformed reference markets when the combined implied
   probability is below `90%` or above `130%`. For example, a two-sided `+400/+400`
   feed is not treated as a 50/50 market.
7. Requires the target payout to be better than the median matched sharp-book payout.
   A Kalshi `+317` target is therefore rejected when its sharp references are around
   `+400`.
8. Removes reference outliers that differ from the highest-priority available
   sportsbook baseline by more than 12 probability points or by more than a 2×
   probability-odds ratio. Excluded prices remain visible in opportunity details.
9. Calculates gross EV as `fair_probability × target_decimal_odds - 1`.
10. Subtracts `MARKET_DATA_COST_ALLOWANCE_PERCENT`, currently `1` percentage point.
11. Rejects the opportunity when consensus hit probability is below the configured
    hard floor, currently `30%`.
12. Returns the opportunity only when the resulting net EV is greater than zero.
13. Calculates `Kelly % = net edge ÷ (target decimal odds - 1)` for the detail view.
    Because every eligible result already clears the `30%` hit-probability floor, the
    feed ranks by net EV first, then hit probability and Kelly score as tie-breakers.

EV already includes win probability, but the product applies a separate minimum
hit-rate policy. A mathematically positive-EV longshot is omitted whenever its
consensus probability is below `30%`.

### Consensus weights

| Source | Weight |
| --- | ---: |
| Pinnacle | 5.0 |
| FanDuel | 4.0 |
| Bookmaker.eu | 3.0 |
| Bet365 | 2.5 |
| Bovada | 2.5 |
| BetOnline | 2.5 |
| DraftKings | 2.0 |
| BetMGM | 2.0 |
| Caesars | 2.0 |
| BetRivers / Fanatics | 2.0 |
| Novig | 2.0 |
| ProphetX | 1.5 |
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
- `refresh=true` fetches new ParlayAPI references and direct Kalshi/Polymarket US target
  asks, then completely replaces the previous snapshot.
- The ParlayAPI request uses `maxAgeSec` so rows older than the configured freshness
  bound are excluded. The default bound is 300 seconds to accommodate the current
  Kalshi refresh cadence.
- Because snapshots are replaced rather than merged, a moved or withdrawn Kalshi or
  Polymarket US line is updated or removed on refresh.
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

### Supabase Auth — implemented

Current call:

```text
GET {SUPABASE_URL}/auth/v1/user
```

The backend forwards the user's bearer access token and the Supabase publishable key.
The frontend supports password sign-in, account creation, email confirmation, password
recovery, Google/Apple OAuth redirects, persisted sessions, automatic token refresh,
and sign-out. OAuth providers and redirect URLs must be enabled in the Supabase project.

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

### Polymarket US public API — implemented for discovery and executable asks

Configured base URL:

```text
https://gateway.polymarket.us
```

Current call, repeated for each configured league slug:

```text
GET /v2/leagues/{slug}/events?active=true&closed=false
```

The finder reads each nested market side's executable `quote.value`. It requires both
sides to have tradable quotes, ignores closed and already-started markets, and builds an
exact Polymarket US URL from the league, event slug, market slug, and outcome ID. The
gateway is public and does not require a key. No wallet or trading credentials are
collected.

Documentation: <https://docs.polymarket.us/api-reference/sports/get-events-by-league-slug>

### Kalshi and Polymarket US market handoff — implemented

Each opportunity includes an `action.marketUrl` for its Kalshi series or Polymarket US
event. The parlay builder displays a compact **Open market** link beside every selected
leg. Each link opens that leg's relevant platform page in a separate tab, including when
the user has selected several legs or a mix of Kalshi and Polymarket US opportunities.

The handoff does not place an order or prefill the platform's Combo Builder.
Neither platform documents a public Combo-prefill URL in its current public API. The
user adds eligible legs, reviews the live quote, and confirms on the platform. No
Kalshi API key, Polymarket US account, or trading credential is collected by Vantage.

Polymarket US currently limits Combos to supported sports moneyline, spread, and total
markets. Platform eligibility and current Combo availability remain authoritative.

### Persona — implemented

Configured base URL:

```text
https://api.withpersona.com/api/v1
```

The backend pre-creates or resumes an inquiry linked to the authenticated Supabase UUID.
The frontend opens Persona's embedded flow using only the inquiry ID, environment ID,
and short-lived resume token returned by Django. Signed webhooks update the user profile;
the frontend also performs a short status sync after the embedded flow completes, which
keeps the sandbox demo usable when a local webhook URL is not publicly reachable.

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
POLYMARKET_US_API_BASE_URL
PERSONA_API_KEY
PERSONA_INQUIRY_TEMPLATE_ID
PERSONA_API_BASE_URL
PERSONA_API_VERSION
PERSONA_ENVIRONMENT_ID
PERSONA_WEBHOOK_SECRET
PERSONA_REQUEST_TIMEOUT_SECONDS
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
MARKET_DATA_MIN_HIT_PROBABILITY_PERCENT
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

Watchlists, alerts, history, parlays, and Gemini explanations also do not have backend
endpoints yet.
