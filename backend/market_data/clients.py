import time

import requests
from django.conf import settings


class MarketDataError(Exception):
    pass


class PublicMarketClient:
    """Small retrying client for public, unauthenticated market-data APIs."""

    retryable_statuses = {429, 502, 503, 504}
    provider_name = "Market data provider"

    def __init__(self, base_url, session=None, sleep=time.sleep):
        self.base_url = base_url.rstrip("/")
        self.timeout = settings.MARKET_DATA_REQUEST_TIMEOUT_SECONDS
        self.session = session or requests
        self.sleep = sleep

    def _get(self, path, params=None):
        response = None
        for attempt in range(2):
            try:
                response = self.session.get(
                    f"{self.base_url}{path}", params=params, timeout=self.timeout
                )
            except requests.RequestException as exc:
                if attempt == 0:
                    self.sleep(1)
                    continue
                raise MarketDataError(
                    f"{self.provider_name} could not be reached."
                ) from exc

            if response.status_code not in self.retryable_statuses or attempt == 1:
                break
            self.sleep(1)

        if response is None:
            raise MarketDataError(f"{self.provider_name} could not be reached.")
        if response.status_code != 200:
            raise MarketDataError(
                f"{self.provider_name} returned HTTP {response.status_code}."
            )
        try:
            return response.json()
        except ValueError as exc:
            raise MarketDataError(
                f"{self.provider_name} returned invalid JSON."
            ) from exc


class KalshiAPIClient(PublicMarketClient):
    provider_name = "Kalshi"

    def __init__(self, session=None, sleep=time.sleep):
        super().__init__(settings.KALSHI_API_BASE_URL, session=session, sleep=sleep)

    def get_events(self, series_ticker):
        events = []
        cursor = None
        for _ in range(5):
            params = {
                "series_ticker": series_ticker,
                "status": "open",
                "with_nested_markets": "true",
                "limit": 200,
            }
            if cursor:
                params["cursor"] = cursor
            payload = self._get("/events", params=params)
            if not isinstance(payload, dict) or not isinstance(
                payload.get("events"), list
            ):
                raise MarketDataError("Kalshi returned an unexpected events response.")
            events.extend(payload["events"])
            cursor = payload.get("cursor")
            if not cursor:
                break
        return events


class PolymarketAPIClient(PublicMarketClient):
    provider_name = "Polymarket US"

    def __init__(self, session=None, sleep=time.sleep):
        super().__init__(
            settings.POLYMARKET_US_API_BASE_URL,
            session=session,
            sleep=sleep,
        )

    def get_events(self, league_slug):
        events = []
        offset = 0
        for _ in range(5):
            payload = self._get(
                f"/v2/leagues/{league_slug}/events",
                params={
                    "active": "true",
                    "closed": "false",
                    "limit": 1000,
                    "offset": offset,
                },
            )
            page = payload.get("events") if isinstance(payload, dict) else None
            if not isinstance(page, list):
                raise MarketDataError(
                    "Polymarket US returned an unexpected events response."
                )
            events.extend(page)
            if len(page) < 1000:
                break
            offset += len(page)
        return events


class PropLineAPIClient(PublicMarketClient):
    """Read current Kalshi, Polymarket, and sportsbook odds from PropLine."""

    provider_name = "PropLine"

    def __init__(self, session=None, sleep=time.sleep):
        base_url = settings.PROPLINE_API_BASE_URL.rstrip("/")
        # Correct the common accidental `/v1p` suffix without masking the
        # configured canonical URL (`https://api.prop-line.com/v1`).
        if base_url.endswith("/v1p"):
            base_url = base_url[:-1]
        super().__init__(base_url, session=session, sleep=sleep)
        self.api_key = settings.PROPLINE_API_KEY

    @property
    def is_configured(self):
        return bool(self.api_key)

    def _get(self, path, params=None):
        if not self.api_key:
            raise MarketDataError("PropLine API key is not configured.")

        response = None
        for attempt in range(2):
            try:
                response = self.session.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers={"X-API-Key": self.api_key},
                    timeout=self.timeout,
                )
            except requests.RequestException as exc:
                if attempt == 0:
                    self.sleep(1)
                    continue
                raise MarketDataError("PropLine could not be reached.") from exc

            if response.status_code not in self.retryable_statuses or attempt == 1:
                break
            retry_after = response.headers.get("Retry-After")
            try:
                delay = max(1, min(int(retry_after), 5))
            except (TypeError, ValueError):
                delay = 1
            self.sleep(delay)

        if response is None:
            raise MarketDataError("PropLine could not be reached.")
        if response.status_code == 401:
            raise MarketDataError("PropLine rejected the configured API key.")
        if response.status_code == 429:
            raise MarketDataError("PropLine rate limit has been reached.")
        if response.status_code != 200:
            raise MarketDataError(f"PropLine returned HTTP {response.status_code}.")
        try:
            return response.json()
        except ValueError as exc:
            raise MarketDataError("PropLine returned invalid JSON.") from exc

    @staticmethod
    def _events(payload, label):
        events = payload.get("events") or payload.get("data") if isinstance(payload, dict) else payload
        if not isinstance(events, list):
            raise MarketDataError(f"PropLine returned an unexpected {label} response.")
        return events

    def get_props(self, sport):
        """Return player- and event-prop rows for every available bookmaker."""
        events = self._events(self._get(f"/sports/{sport}/events"), "events")
        rows = []
        for event in events[: settings.MARKET_DATA_PROPLINE_EVENT_LIMIT]:
            if not isinstance(event, dict) or not event.get("id"):
                continue
            payload = self._get(
                f"/sports/{sport}/events/{event['id']}/odds",
                params={"includeLinks": "true"},
            )
            if isinstance(payload, dict):
                rows.extend(self._normalize_event_rows(sport, payload))
        return rows

    def get_game_odds(self, sport):
        """Return current game markets from every available bookmaker."""
        payload = self._get(
            f"/sports/{sport}/odds",
            params={"markets": "h2h,spreads,totals", "includeLinks": "true"},
        )
        return self._events(payload, "game-odds")

    def get_kalshi_props(self, sport):
        """Return only current Kalshi player- and event-prop rows."""
        events = self._events(self._get(f"/sports/{sport}/events"), "events")
        rows = []
        for event in events[: settings.MARKET_DATA_PROPLINE_EVENT_LIMIT]:
            if not isinstance(event, dict) or not event.get("id"):
                continue
            payload = self._get(
                f"/sports/{sport}/events/{event['id']}/odds",
                params={"bookmakers": "kalshi", "includeLinks": "true"},
            )
            if isinstance(payload, dict):
                rows.extend(self._normalize_event_rows(sport, payload))
        return [row for row in rows if row.get("source") == "kalshi"]

    def get_kalshi_game_odds(self, sport):
        """Return only current Kalshi moneyline, spread, and total markets."""
        events = self._events(
            self._get(
                f"/sports/{sport}/odds",
                params={
                    "markets": "h2h,spreads,totals",
                    "bookmakers": "kalshi",
                    "includeLinks": "true",
                },
            ),
            "game-odds",
        )
        normalized = []
        for event in events:
            if not isinstance(event, dict):
                continue
            books = []
            for book in event.get("bookmakers") or []:
                if not isinstance(book, dict) or str(book.get("key") or "").lower() != "kalshi":
                    continue
                current_book = dict(book)
                current_book["stale_seconds"] = 0
                books.append(current_book)
            if books:
                normalized.append({**event, "bookmakers": books})
        return normalized

    @staticmethod
    def _normalize_event_rows(sport, event):
        """Normalize each available bookmaker into the shared prop-row shape."""
        rows = []
        for book in event.get("bookmakers") or []:
            if not isinstance(book, dict) or not book.get("key"):
                continue
            for market in book.get("markets") or []:
                if not isinstance(market, dict):
                    continue
                paired = {}
                for outcome in market.get("outcomes") or []:
                    if not isinstance(outcome, dict):
                        continue
                    side = str(outcome.get("name") or "").strip().lower()
                    if side in {"yes", "over"}:
                        side = "over"
                    elif side in {"no", "under"}:
                        side = "under"
                    else:
                        continue
                    player = outcome.get("description") or market.get("description") or ""
                    point = outcome.get("point")
                    key = (str(player).strip().lower(), str(point))
                    paired.setdefault(key, {"player": player, "point": point})[side] = outcome

                for pair in paired.values():
                    over, under = pair.get("over"), pair.get("under")
                    if not over or not under:
                        continue
                    rows.append(
                        {
                            "event_id": event.get("id"),
                            "canonical_event_id": event.get("id"),
                            "sport_key": event.get("sport_key") or sport,
                            "away_team": event.get("away_team"),
                            "home_team": event.get("home_team"),
                            "commence_time": event.get("commence_time"),
                            "source": str(book.get("key")).lower(),
                            "source_title": book.get("title") or str(book.get("key")).title(),
                            "player_name": pair["player"],
                            "market_key": market.get("key"),
                            "market_label": market.get("description") or market.get("key"),
                            "line": pair["point"],
                            "over_price": over.get("price"),
                            "under_price": under.get("price"),
                            "snapshot_time": market.get("last_update"),
                            "url": book.get("link"),
                            "over_url": over.get("link") or book.get("link"),
                            "under_url": under.get("link") or book.get("link"),
                        }
                    )
        return rows


class ParlayAPIClient:
    """HTTP client for ParlayAPI's normalized live sportsbook feed."""

    retryable_statuses = {429, 502, 503, 504}

    def __init__(self, session=None, sleep=time.sleep):
        self.base_url = settings.PARLAY_API_BASE_URL.rstrip("/")
        self.api_key = settings.PARLAY_API_KEY
        self.timeout = settings.MARKET_DATA_REQUEST_TIMEOUT_SECONDS
        self.session = session or requests
        self.sleep = sleep

    def _get(self, path, params=None):
        if not self.api_key:
            raise MarketDataError("ParlayAPI key is not configured.")

        response = None
        for attempt in range(2):
            try:
                response = self.session.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers={"X-API-Key": self.api_key},
                    timeout=self.timeout,
                )
            except requests.RequestException as exc:
                if attempt == 0:
                    self.sleep(1)
                    continue
                raise MarketDataError("ParlayAPI could not be reached.") from exc

            if response.status_code not in self.retryable_statuses or attempt == 1:
                break

            retry_after = response.headers.get("Retry-After")
            try:
                delay = max(1, min(int(retry_after), 5))
            except (TypeError, ValueError):
                delay = 1
            self.sleep(delay)

        if response is None:
            raise MarketDataError("ParlayAPI could not be reached.")
        if response.status_code == 401:
            raise MarketDataError("ParlayAPI rejected the configured API key.")
        if response.status_code == 403:
            raise MarketDataError(
                "ParlayAPI credits are exhausted or this endpoint is unavailable on the current plan."
            )
        if response.status_code == 429:
            raise MarketDataError("ParlayAPI rate limit has been reached.")
        if response.status_code != 200:
            request_id = response.headers.get("X-Request-ID")
            suffix = f" Request ID: {request_id}." if request_id else ""
            raise MarketDataError(f"ParlayAPI returned HTTP {response.status_code}.{suffix}")

        try:
            return response.json()
        except ValueError as exc:
            raise MarketDataError("ParlayAPI returned invalid JSON.") from exc

    @staticmethod
    def _requested_bookmakers():
        """Request only independent sportsbook and exchange references."""
        targets = {"kalshi", "polymarket"}
        return ",".join(
            str(book)
            for book in settings.MARKET_DATA_BOOKMAKERS
            if str(book).lower() not in targets
        )

    def get_props(self, sport):
        payload = self._get(
            f"/sports/{sport}/props",
            params={
                "bookmakers": self._requested_bookmakers(),
                "oddsFormat": "american",
                "dfsOdds": "midpoint",
                "include_event_markets": "true",
                "maxAgeSec": settings.MARKET_DATA_MAX_AGE_SECONDS,
                "limit": settings.MARKET_DATA_PROP_LIMIT,
            },
        )

        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("props", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise MarketDataError(
            "ParlayAPI returned an unexpected player-props response."
        )

    def get_game_odds(self, sport):
        payload = self._get(
            f"/sports/{sport}/odds",
            params={
                "regions": "us",
                "markets": "h2h,spreads,totals",
                "bookmakers": self._requested_bookmakers(),
                "oddsFormat": "american",
                "dateFormat": "iso",
                "include": "verification",
            },
        )

        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("events", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise MarketDataError(
            "ParlayAPI returned an unexpected game-odds response."
        )

    def get_prediction_markets(self, sport):
        """Return ParlayAPI's Kalshi, Polymarket, and Novig prediction rows.

        Kalshi is not included in ParlayAPI's standard game-odds or player-prop
        feeds. Its current sports futures live on this prediction-market route.
        """
        payload = self._get(
            f"/prediction-markets/{sport}",
            params={"sources": "kalshi,polymarket,novig"},
        )
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("markets", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise MarketDataError(
            "ParlayAPI returned an unexpected prediction-markets response."
        )
