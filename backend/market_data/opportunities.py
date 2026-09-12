import hashlib
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from statistics import median
from threading import Lock

from django.conf import settings
from django.core.cache import cache

from .clients import (
    KalshiAPIClient,
    MarketDataError,
    ParlayAPIClient,
    PolymarketAPIClient,
)
from .target_markets import (
    KALSHI_SERIES,
    POLYMARKET_SERIES,
    merge_direct_targets,
    normalize_kalshi_events,
    normalize_polymarket_events,
)


SPORTS = {
    "baseball_mlb": {"label": "MLB", "short": "mlb"},
    "americanfootball_nfl": {"label": "NFL", "short": "nfl"},
    "basketball_nba": {"label": "NBA", "short": "nba"},
    "icehockey_nhl": {"label": "NHL", "short": "nhl"},
    "basketball_wnba": {"label": "WNBA", "short": "wnba"},
    "soccer_epl": {"label": "EPL", "short": "epl"},
}
TARGET_BOOKS = {"kalshi": "Kalshi", "polymarket": "Polymarket"}
REFERENCE_WEIGHTS = {
    "pinnacle": 5.0,
    "fanduel": 4.0,
    "novig": 2.0,
    "prophetx": 1.5,
    "bookmaker_eu": 3.0,
    "bet365": 2.5,
    "bovada": 2.5,
    "betonline": 2.5,
    "draftkings": 2.0,
    "betmgm": 2.0,
    "caesars": 2.0,
    "betrivers": 2.0,
    "fanatics": 2.0,
    "fliff": 1.5,
    "hardrock": 1.5,
    "parx": 1.5,
    "unibet": 1.5,
    "tenbet": 1.5,
    "betr": 1.0,
    "sleeper": 1.0,
    "pick6": 1.0,
    "underdog": 1.0,
    "prizepicks": 1.0,
    "kalshi": 0.75,
    "polymarket": 0.75,
}
SOURCE_ALIASES = {
    "betonlineag": "betonline",
    "prizepicks_mobile": "prizepicks",
}
MARKET_KEY_ALIASES = {
    "exchange_both_teams_to_score": "both_teams_to_score",
    "game_team_totals": "team_totals",
    "soccer_team_totals": "team_totals",
}
EVENT_PROP_MARKETS = {"both_teams_to_score"}
SHARP_ANCHORS = {
    "pinnacle",
    "fanduel",
    "bookmaker_eu",
    "bet365",
    "bovada",
    "betonline",
}
SHARP_BASELINE_ORDER = (
    "pinnacle",
    "fanduel",
    "bookmaker_eu",
    "bet365",
    "bovada",
    "betonline",
)
MAX_BASELINE_PROBABILITY_GAP = 0.12
MIN_BASELINE_ODDS_RATIO = 0.5
MAX_BASELINE_ODDS_RATIO = 2.0
MIN_REFERENCE_PROBABILITY_SUM = 0.9
MAX_REFERENCE_PROBABILITY_SUM = 1.3


def american_implied_probability(price):
    try:
        odds = Decimal(str(price))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if odds == 0:
        return None
    if odds > 0:
        return float(Decimal("100") / (odds + Decimal("100")))
    return float((-odds) / ((-odds) + Decimal("100")))


def american_decimal_odds(price):
    try:
        odds = Decimal(str(price))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if odds == 0:
        return None
    if odds > 0:
        return float(Decimal("1") + odds / Decimal("100"))
    return float(Decimal("1") + Decimal("100") / (-odds))


def _normalized(value):
    value = re.sub(r"\([^)]*\)", " ", str(value or "").lower())
    tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", value)
        if token not in {"afc", "cf", "club", "fc", "football"}
    ]
    normalized = " ".join(tokens)
    return "draw" if normalized == "tie" else normalized


def _market_key(row):
    key = str(row.get("market_key") or "")
    return MARKET_KEY_ALIASES.get(key, key)


def _same_text(left, right):
    left_value = _normalized(left)
    right_value = _normalized(right)
    return bool(left_value and right_value and left_value == right_value)


def _same_point(left, right):
    try:
        return abs(float(left) - float(right)) < 0.001
    except (TypeError, ValueError):
        return left is None and right is None


def _source_key(row):
    key = str(row.get("source") or row.get("bookmaker") or "").lower()
    return SOURCE_ALIASES.get(key, key)


def _parse_time(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _row_time(row):
    value = row.get("snapshot_time") or row.get("last_update")
    parsed = _parse_time(value)
    if parsed:
        return parsed
    milliseconds = row.get("last_update_ms")
    try:
        return datetime.fromtimestamp(float(milliseconds) / 1000, timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def _row_updated_at(row):
    parsed = _row_time(row)
    return parsed.isoformat() if parsed else None


def _row_is_current(row):
    if row.get("is_current") is False:
        return False
    try:
        return float(row.get("age_seconds")) <= settings.MARKET_DATA_MAX_AGE_SECONDS
    except (TypeError, ValueError):
        return True


def _is_upcoming(row, require_time=False):
    commence_time = _parse_time(row.get("commence_time"))
    if commence_time is None:
        return not require_time
    return commence_time > datetime.now(timezone.utc)


def _same_event(left, right):
    left_canonical = left.get("canonical_event_id")
    right_canonical = right.get("canonical_event_id")
    if left_canonical and right_canonical:
        return str(left_canonical) == str(right_canonical)

    left_event = left.get("event_id")
    right_event = right.get("event_id")
    if left_event and right_event and str(left_event) == str(right_event):
        return True

    teams_match = (
        _same_text(left.get("home_team"), right.get("home_team"))
        and _same_text(left.get("away_team"), right.get("away_team"))
    )
    if not teams_match:
        return False

    left_time = _parse_time(left.get("commence_time"))
    right_time = _parse_time(right.get("commence_time"))
    if left_time and right_time:
        return abs((left_time - right_time).total_seconds()) <= 7200
    return True


def _same_prop(target, candidate):
    target_market = _market_key(target)
    candidate_market = _market_key(candidate)
    players_match = _same_text(
        target.get("player_name") or target.get("player"),
        candidate.get("player_name") or candidate.get("player"),
    )
    return (
        _same_event(target, candidate)
        and (players_match or target_market in EVENT_PROP_MARKETS)
        and target_market == candidate_market
        and _same_point(target.get("line"), candidate.get("line"))
    )


def _prop_group_key(row):
    event_key = row.get("canonical_event_id") or row.get("event_id")
    if not event_key:
        event_key = "|".join(
            (
                _normalized(row.get("home_team")),
                _normalized(row.get("away_team")),
                str(_parse_time(row.get("commence_time")) or ""),
            )
        )
    try:
        line = round(float(row.get("line")), 4)
    except (TypeError, ValueError):
        line = None
    return str(event_key), _market_key(row), line


def _fair_probabilities(row, validate_reference=False):
    over = american_implied_probability(row.get("over_price"))
    under = american_implied_probability(row.get("under_price"))
    if over is None or under is None or over + under <= 0:
        return None
    total = over + under
    if validate_reference and not (
        MIN_REFERENCE_PROBABILITY_SUM
        <= total
        <= MAX_REFERENCE_PROBABILITY_SUM
    ):
        return None
    return {"over": over / total, "under": under / total}


def _collect_references(target, rows, side):
    target_source = _source_key(target)
    by_source = {}
    for candidate in rows:
        source = _source_key(candidate)
        if source == target_source or source not in REFERENCE_WEIGHTS:
            continue
        if not _row_is_current(candidate) or not _same_prop(target, candidate):
            continue
        fair = _fair_probabilities(candidate, validate_reference=True)
        price = candidate.get(f"{side}_price")
        if fair is None or american_implied_probability(price) is None:
            continue
        reference = {
            "book_key": source,
            "book_title": candidate.get("source_title") or source.title(),
            "fair_probability": fair[side],
            "price": price,
            "last_update": _row_updated_at(candidate),
            "weight": REFERENCE_WEIGHTS[source],
        }
        current = by_source.get(source)
        if current is None or (reference["last_update"] or "") > (current["last_update"] or ""):
            by_source[source] = reference
    return sorted(by_source.values(), key=lambda item: item["weight"], reverse=True)


def _weighted_consensus_probability(references):
    total_weight = sum(reference["weight"] for reference in references)
    if total_weight <= 0:
        return None
    return sum(
        reference["fair_probability"] * reference["weight"]
        for reference in references
    ) / total_weight


def _probability_odds(probability):
    if probability is None or not 0 < probability < 1:
        return None
    return probability / (1 - probability)


def _filter_reference_outliers(references):
    baseline = next(
        (
            reference
            for source in SHARP_BASELINE_ORDER
            for reference in references
            if reference["book_key"] == source
        ),
        None,
    )
    if baseline is None:
        return []
    baseline_probability = baseline["fair_probability"]
    baseline_odds = _probability_odds(baseline_probability)
    if baseline_odds is None:
        return []

    included = []
    for reference in references:
        probability = reference["fair_probability"]
        probability_odds = _probability_odds(probability)
        if probability_odds is None:
            continue
        odds_ratio = probability_odds / baseline_odds
        if (
            abs(probability - baseline_probability)
            <= MAX_BASELINE_PROBABILITY_GAP
            and MIN_BASELINE_ODDS_RATIO
            <= odds_ratio
            <= MAX_BASELINE_ODDS_RATIO
        ):
            included.append(reference)
    return included


def _has_sharp_anchor(references):
    return any(reference["book_key"] in SHARP_ANCHORS for reference in references)


def _has_sufficient_reference_consensus(references):
    return len(references) >= 2 or (
        len(references) == 1 and references[0]["book_key"] == "pinnacle"
    )


def _target_beats_sharp_median(target_decimal_odds, references):
    sharp_prices = [
        american_decimal_odds(reference.get("price"))
        for reference in references
        if reference.get("book_key") in SHARP_ANCHORS
    ]
    sharp_prices = [price for price in sharp_prices if price is not None]
    return bool(
        sharp_prices
        and float(target_decimal_odds) > median(sharp_prices) + 1e-9
    )


def _meets_hit_probability_floor(fair_probability):
    return (
        fair_probability * 100
        >= settings.MARKET_DATA_MIN_HIT_PROBABILITY_PERCENT
    )


def _reference_price_cards(
    platform,
    platform_title,
    target_price,
    target_probability,
    matched_references,
    consensus_references,
):
    included_sources = {
        reference["book_key"] for reference in consensus_references
    }
    cards = [
        {
            "id": platform,
            "name": platform_title,
            "priceLabel": _format_american(target_price),
            "odds": target_price,
            "impliedProbability": round(target_probability, 4),
            "isTarget": True,
            "includedInConsensus": False,
            "subLabel": f"Target · {target_probability * 100:.1f}% implied",
        }
    ]
    for reference in matched_references:
        included = reference["book_key"] in included_sources
        cards.append(
            {
                "id": reference["book_key"],
                "name": reference["book_title"],
                "priceLabel": _format_american(reference["price"]),
                "odds": reference["price"],
                "otherName": reference.get("other_name"),
                "otherPriceLabel": _format_american(reference.get("other_price"))
                if reference.get("other_price") is not None
                else None,
                "fairProbability": round(reference["fair_probability"], 4),
                "weight": reference["weight"] if included else 0,
                "isTarget": False,
                "includedInConsensus": included,
                "subLabel": (
                    f"{reference['fair_probability'] * 100:.1f}% no-vig"
                    f" · {reference['weight']:g}× weight"
                    if included
                    else "Excluded from consensus · price outlier"
                ),
            }
        )
    return cards


def probability_aware_evaluation(fair_probability, decimal_odds, net_ev_percent):
    """Describe hit likelihood and produce a Kelly-based ranking value.

    EV remains the expected return per dollar. The Kelly fraction divides that
    edge by the profit multiple, which prevents large-payout, low-probability
    outcomes from automatically dominating the default ordering.
    """
    probability = max(0.0, min(float(fair_probability), 1.0))
    profit_multiple = max(0.0, float(decimal_odds) - 1.0)
    net_edge = max(0.0, float(net_ev_percent) / 100.0)
    full_kelly = min(1.0, net_edge / profit_multiple) if profit_multiple else 0.0
    quarter_kelly = full_kelly * 0.25

    if probability < 0.25:
        tier, tier_label = "longshot", "Longshot"
    elif probability < 0.5:
        tier, tier_label = "lower", "Lower hit chance"
    elif probability < 0.65:
        tier, tier_label = "moderate", "Moderate hit chance"
    else:
        tier, tier_label = "higher", "Higher hit chance"

    return {
        "hitProbability": round(probability * 100, 2),
        "hitProbabilityLabel": f"{probability * 100:.1f}%",
        "missProbability": round((1.0 - probability) * 100, 2),
        "tier": tier,
        "tierLabel": tier_label,
        "kellyPercent": round(full_kelly * 100, 2),
        "quarterKellyPercent": round(quarter_kelly * 100, 2),
        "rankScore": round(full_kelly * 100, 4),
    }


def _format_american(price):
    try:
        number = int(Decimal(str(price)))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return f"+{number}" if number > 0 else str(number)


def _event_label(row):
    away = row.get("away_team")
    home = row.get("home_team")
    return f"{away} @ {home}" if away and home else row.get("event_title") or "Upcoming event"


def _opportunity_id(target, side):
    raw = "|".join(
        str(value or "")
        for value in (
            _source_key(target),
            target.get("sport_key"),
            target.get("canonical_event_id") or target.get("event_id"),
            target.get("player_name") or target.get("player"),
            target.get("market_key"),
            target.get("line"),
            side,
        )
    )
    return f"{_source_key(target)}-{hashlib.sha256(raw.encode()).hexdigest()[:20]}"


def build_prop_opportunities(rows):
    rows = [row for row in rows if isinstance(row, dict) and _row_is_current(row)]
    rows_by_market = defaultdict(list)
    for row in rows:
        rows_by_market[_prop_group_key(row)].append(row)
    results = []
    cost_allowance = settings.MARKET_DATA_COST_ALLOWANCE_PERCENT

    for target in rows:
        platform = _source_key(target)
        if platform not in TARGET_BOOKS:
            continue
        if not _is_upcoming(target) or _fair_probabilities(target) is None:
            continue
        platform_title = TARGET_BOOKS[platform]

        for side in ("over", "under"):
            target_price = target.get(f"{side}_price")
            target_probability = american_implied_probability(target_price)
            decimal_odds = american_decimal_odds(target_price)
            matched_references = _collect_references(
                target, rows_by_market[_prop_group_key(target)], side
            )
            references = _filter_reference_outliers(matched_references)
            fair_probability = _weighted_consensus_probability(references)
            if target_probability is None or decimal_odds is None or fair_probability is None:
                continue
            if not _has_sufficient_reference_consensus(references):
                continue
            if not _has_sharp_anchor(references):
                continue
            if not _target_beats_sharp_median(decimal_odds, references):
                continue
            if not _meets_hit_probability_floor(fair_probability):
                continue

            gross_ev_percent = (fair_probability * decimal_odds - 1) * 100
            net_ev_percent = gross_ev_percent - cost_allowance
            if net_ev_percent <= 0:
                continue
            evaluation = probability_aware_evaluation(
                fair_probability, decimal_odds, net_ev_percent
            )

            player = target.get("player_name") or target.get("player") or "Selection"
            canonical_market_key = _market_key(target)
            market_title = target.get("market_label") or str(
                canonical_market_key or "Player prop"
            ).replace("_", " ").title()
            event_name = _event_label(target)
            side_title = (
                ("Yes" if side == "over" else "No")
                if canonical_market_key in EVENT_PROP_MARKETS
                else side.title()
            )
            line = target.get("line")
            line_label = f"{side_title} {line}" if line is not None else side_title
            target_cents = target_probability * 100
            target_odds = _format_american(target_price)
            advantage_points = (fair_probability - target_probability) * 100
            identifier = _opportunity_id(target, side)
            source_names = [reference["book_title"] for reference in references]

            results.append(
                {
                    "id": identifier,
                    "selection": {
                        "title": f"{player} — {side_title}",
                        "subtitle": event_name,
                        "tags": [SPORTS.get(target.get("sport_key"), {}).get("label", "Sports")],
                    },
                    "market": {"title": market_title, "subtitle": line_label},
                    "platform": {"name": platform_title},
                    "price": {
                        "label": f"{target_cents:.1f}¢ · {target_odds}",
                        "odds": target_price,
                        "oddsLabel": target_odds,
                        "source": platform_title,
                    },
                    "consensus": {
                        "label": f"{fair_probability * 100:.1f}%",
                        "probability": round(fair_probability, 4),
                        "sourceCount": len(references),
                        "sources": source_names,
                    },
                    "ev": {
                        "label": f"+{net_ev_percent:.1f}%",
                        "value": round(net_ev_percent, 2),
                        "isPositive": True,
                    },
                    "evaluation": evaluation,
                    "hasDetail": True,
                    "_meta": {
                        "platform": platform,
                        "sport": target.get("sport_key"),
                        "market_type": (
                            "game_prop"
                            if canonical_market_key
                            in EVENT_PROP_MARKETS | {"team_totals"}
                            else "player_prop"
                        ),
                        "search": " ".join(
                            str(value or "")
                            for value in (event_name, player, market_title, side_title, platform_title)
                        ).lower(),
                    },
                    "_detail": {
                        "sources": _reference_price_cards(
                            platform,
                            platform_title,
                            target_price,
                            target_probability,
                            matched_references,
                            references,
                        ),
                        "target": {
                            "name": platform_title,
                            "side": side_title,
                            "line": line,
                            "priceCents": round(target_cents, 2),
                            "odds": target_price,
                            "oddsLabel": target_odds,
                        },
                        "signal": {
                            "label": "Estimated value gap",
                            "percent": round(fair_probability * 100, 2),
                            "leftLabel": f"Market {target_cents:.1f}%",
                            "rightLabel": f"Fair {fair_probability * 100:.1f}%",
                        },
                        "stats": [
                            {
                                "label": "Price advantage",
                                "value": f"+{advantage_points:.1f} pts",
                                "isPositive": advantage_points > 0,
                            },
                            {
                                "label": "Estimated EV after costs",
                                "value": f"+{net_ev_percent:.1f}%",
                                "isPositive": True,
                            },
                            {
                                "label": "Estimated hit chance",
                                "value": (
                                    f"{evaluation['hitProbabilityLabel']}"
                                    f" · {evaluation['tierLabel']}"
                                ),
                                "isPositive": False,
                            },
                            {
                                "label": "Quarter-Kelly reference",
                                "value": f"{evaluation['quarterKellyPercent']:.2f}% of bankroll",
                                "isPositive": False,
                            },
                            {
                                "label": "Target quote",
                                "value": f"{platform_title} {target_odds}",
                                "isPositive": False,
                            },
                            {
                                "label": "Consensus sources",
                                "value": str(len(references)),
                                "isPositive": False,
                            },
                        ],
                        "updatedAt": _row_updated_at(target),
                        "sourceUrl": target.get("url") or target.get("link"),
                        "disclaimer": "Informational estimate. Prices change and results are not guaranteed.",
                    },
                }
            )
    return results


def _book_is_current(book):
    try:
        return float(book.get("stale_seconds")) <= settings.MARKET_DATA_MAX_AGE_SECONDS
    except (TypeError, ValueError):
        verified_at = _parse_time(book.get("verified_at"))
        if verified_at:
            return (
                datetime.now(timezone.utc) - verified_at
            ).total_seconds() <= settings.MARKET_DATA_MAX_AGE_SECONDS
        return True


def _market_is_current(book, market):
    return _book_is_current(book)


def _game_market_signature(market):
    outcomes = tuple(
        sorted(
            (
                _normalized(outcome.get("name")),
                str(outcome.get("point")),
            )
            for outcome in market.get("outcomes", [])
        )
    )
    return (
        market.get("key"),
        market.get("period"),
        _normalized(market.get("team")),
        outcomes,
    )


def _latest_game_markets(book):
    latest = {}
    for market in book.get("markets", []):
        if not isinstance(market, dict) or not _market_is_current(book, market):
            continue
        signature = _game_market_signature(market)
        current = latest.get(signature)
        if current is None or str(market.get("last_update") or "") > str(
            current.get("last_update") or ""
        ):
            latest[signature] = market
    return list(latest.values())


def _same_game_market_context(target, candidate):
    if target.get("key") != candidate.get("key"):
        return False
    if target.get("period") != candidate.get("period"):
        return False
    target_team = target.get("team")
    candidate_team = candidate.get("team")
    if bool(target_team) != bool(candidate_team):
        return False
    return not target_team or _same_text(target_team, candidate_team)


def _same_game_outcome(target, candidate):
    return _same_point(target.get("point"), candidate.get("point")) and _same_text(
        target.get("name"), candidate.get("name")
    )


def _find_game_reference(target_market, target_outcome, source, book):
    if not _book_is_current(book):
        return None
    for market in _latest_game_markets(book):
        if not _same_game_market_context(target_market, market):
            continue
        outcomes = market.get("outcomes") or []
        match_index = next(
            (
                index
                for index, outcome in enumerate(outcomes)
                if _same_game_outcome(target_outcome, outcome)
            ),
            None,
        )
        if match_index is None or len(outcomes) < 2:
            continue
        probabilities = [
            american_implied_probability(outcome.get("price")) for outcome in outcomes
        ]
        if any(probability is None for probability in probabilities):
            continue
        total = sum(probabilities)
        if not (
            MIN_REFERENCE_PROBABILITY_SUM
            <= total
            <= MAX_REFERENCE_PROBABILITY_SUM
        ):
            continue
        other_index = next(
            (index for index in range(len(outcomes)) if index != match_index), None
        )
        other_outcome = outcomes[other_index] if other_index is not None else None
        return {
            "book_key": source,
            "book_title": book.get("title") or source.title(),
            "fair_probability": probabilities[match_index] / total,
            "price": outcomes[match_index].get("price"),
            "other_name": other_outcome.get("name") if other_outcome else None,
            "other_price": other_outcome.get("price") if other_outcome else None,
            "last_update": market.get("last_update") or book.get("last_update"),
            "weight": REFERENCE_WEIGHTS[source],
        }
    return None


def _collect_game_references(target_market, target_outcome, books, target_platform):
    references = []
    for source, weight in REFERENCE_WEIGHTS.items():
        if source == target_platform:
            continue
        book = books.get(source)
        if not book:
            continue
        reference = _find_game_reference(target_market, target_outcome, source, book)
        if reference:
            reference["weight"] = weight
            references.append(reference)
    return sorted(references, key=lambda item: item["weight"], reverse=True)


def _game_market_title(market):
    labels = {"h2h": "Moneyline", "spreads": "Spread", "totals": "Total"}
    return market.get("description") or labels.get(
        market.get("key"), str(market.get("key") or "Game market").replace("_", " ").title()
    )


def _game_opportunity_id(platform, event, market, outcome):
    raw = "|".join(
        str(value or "")
        for value in (
            platform,
            event.get("sport_key"),
            event.get("canonical_event_id") or event.get("id"),
            market.get("key"),
            market.get("period"),
            market.get("team"),
            outcome.get("name"),
            outcome.get("point"),
        )
    )
    return f"{platform}-{hashlib.sha256(raw.encode()).hexdigest()[:20]}"


def build_game_opportunities(events):
    results = []
    seen_ids = set()
    cost_allowance = settings.MARKET_DATA_COST_ALLOWANCE_PERCENT

    for event in events:
        if not isinstance(event, dict):
            continue
        if not _is_upcoming(event, require_time=True):
            continue
        books = {
            SOURCE_ALIASES.get(str(book.get("key") or "").lower(), str(book.get("key") or "").lower()): book
            for book in event.get("bookmakers", [])
            if isinstance(book, dict)
        }
        for platform, platform_title in TARGET_BOOKS.items():
            target_book = books.get(platform)
            if not target_book or not _book_is_current(target_book):
                continue
            for market in _latest_game_markets(target_book):
                if market.get("key") not in {"h2h", "spreads", "totals"}:
                    continue
                target_outcomes = market.get("outcomes") or []
                # A normalized game market must contain both sides. This rejects
                # one-sided season/futures contracts incorrectly attached to a
                # team's next game by an upstream classifier.
                if len(target_outcomes) < 2:
                    continue
                for outcome in target_outcomes:
                    target_price = outcome.get("price")
                    target_probability = american_implied_probability(target_price)
                    decimal_odds = american_decimal_odds(target_price)
                    other_outcome = next(
                        (
                            candidate
                            for candidate in target_outcomes
                            if candidate is not outcome
                        ),
                        None,
                    )
                    matched_references = _collect_game_references(
                        market, outcome, books, platform
                    )
                    references = _filter_reference_outliers(matched_references)
                    fair_probability = _weighted_consensus_probability(references)
                    if (
                        target_probability is None
                        or decimal_odds is None
                        or fair_probability is None
                    ):
                        continue
                    if not _has_sufficient_reference_consensus(references):
                        continue
                    if not _has_sharp_anchor(references):
                        continue
                    if not _target_beats_sharp_median(decimal_odds, references):
                        continue
                    if not _meets_hit_probability_floor(fair_probability):
                        continue

                    net_ev_percent = (
                        (fair_probability * decimal_odds - 1) * 100 - cost_allowance
                    )
                    if net_ev_percent <= 0:
                        continue
                    evaluation = probability_aware_evaluation(
                        fair_probability, decimal_odds, net_ev_percent
                    )

                    identifier = _game_opportunity_id(platform, event, market, outcome)
                    if identifier in seen_ids:
                        continue
                    seen_ids.add(identifier)
                    event_name = _event_label(event)
                    market_title = _game_market_title(market)
                    point = outcome.get("point")
                    subtitle = " · ".join(
                        str(value)
                        for value in (
                            f"Line {point}" if point is not None else None,
                            market.get("period"),
                        )
                        if value
                    )
                    target_cents = target_probability * 100
                    target_odds = _format_american(target_price)
                    advantage_points = (fair_probability - target_probability) * 100
                    source_names = [reference["book_title"] for reference in references]
                    updated_at = market.get("last_update") or target_book.get("last_update")

                    results.append(
                        {
                            "id": identifier,
                            "selection": {
                                "title": outcome.get("name") or market_title,
                                "subtitle": event_name,
                                "tags": [SPORTS.get(event.get("sport_key"), {}).get("label", "Sports")],
                            },
                            "market": {"title": market_title, "subtitle": subtitle},
                            "platform": {"name": platform_title},
                            "price": {
                                "label": f"{target_cents:.1f}¢ · {target_odds}",
                                "odds": target_price,
                                "oddsLabel": target_odds,
                                "source": platform_title,
                                "otherName": other_outcome.get("name") if other_outcome else None,
                                "otherLabel": _format_american(other_outcome.get("price"))
                                if other_outcome
                                else None,
                            },
                            "consensus": {
                                "label": f"{fair_probability * 100:.1f}%",
                                "probability": round(fair_probability, 4),
                                "sourceCount": len(references),
                                "sources": source_names,
                            },
                            "ev": {
                                "label": f"+{net_ev_percent:.1f}%",
                                "value": round(net_ev_percent, 2),
                                "isPositive": True,
                                "probabilityLabel": f"{fair_probability * 100:.1f}% to hit",
                            },
                            "evaluation": evaluation,
                            "hasDetail": True,
                            "_meta": {
                                "platform": platform,
                                "sport": event.get("sport_key"),
                                "market_type": "game_market",
                                "search": " ".join(
                                    str(value or "")
                                    for value in (
                                        event_name,
                                        outcome.get("name"),
                                        market_title,
                                        platform_title,
                                    )
                                ).lower(),
                            },
                            "_detail": {
                                "sources": _reference_price_cards(
                                    platform,
                                    platform_title,
                                    target_price,
                                    target_probability,
                                    matched_references,
                                    references,
                                ),
                                "target": {
                                    "name": platform_title,
                                    "line": point,
                                    "priceCents": round(target_cents, 2),
                                    "odds": target_price,
                                    "oddsLabel": target_odds,
                                },
                                "signal": {
                                    "label": "Estimated value gap",
                                    "percent": round(fair_probability * 100, 2),
                                    "leftLabel": f"Market {target_cents:.1f}%",
                                    "rightLabel": f"Fair {fair_probability * 100:.1f}%",
                                },
                                "stats": [
                                    {
                                        "label": "Price advantage",
                                        "value": f"+{advantage_points:.1f} pts",
                                        "isPositive": advantage_points > 0,
                                    },
                                    {
                                        "label": "Estimated EV after costs",
                                        "value": f"+{net_ev_percent:.1f}%",
                                        "isPositive": True,
                                    },
                                    {
                                        "label": "Estimated hit chance",
                                        "value": (
                                            f"{evaluation['hitProbabilityLabel']}"
                                            f" · {evaluation['tierLabel']}"
                                        ),
                                        "isPositive": False,
                                    },
                                    {
                                        "label": "Quarter-Kelly reference",
                                        "value": (
                                            f"{evaluation['quarterKellyPercent']:.2f}%"
                                            " of bankroll"
                                        ),
                                        "isPositive": False,
                                    },
                                    {
                                        "label": "Target quote",
                                        "value": f"{platform_title} {target_odds}",
                                        "isPositive": False,
                                    },
                                    {
                                        "label": "Consensus sources",
                                        "value": str(len(references)),
                                        "isPositive": False,
                                    },
                                ],
                                "updatedAt": updated_at,
                                "sourceUrl": target_book.get("link"),
                                "disclaimer": "Informational estimate. Prices change and results are not guaranteed.",
                            },
                        }
                    )
    return results


class OpportunityService:
    cache_key = "market_data:opportunities:thirty-percent-floor:v9"
    _refresh_lock = Lock()

    def __init__(self, client=None, kalshi_client=None, polymarket_client=None):
        supplied_client = client is not None
        self.client = client or ParlayAPIClient()
        # Unit-test and caller-supplied Parlay clients remain isolated unless
        # target clients are explicitly supplied. The module singleton below
        # receives all three live clients.
        self.kalshi_client = kalshi_client if supplied_client else (
            kalshi_client or KalshiAPIClient()
        )
        self.polymarket_client = polymarket_client if supplied_client else (
            polymarket_client or PolymarketAPIClient()
        )

    def _refresh(self):
        prop_rows = []
        game_events = []
        direct_game_targets = []
        direct_prop_targets = []
        loaded_sports = []
        failures = []

        sports = [sport for sport in settings.MARKET_DATA_SPORTS if sport in SPORTS]

        def load_parlay_sport(sport):
            result = {"sport": sport, "props": [], "games": [], "failures": []}
            try:
                sport_rows = self.client.get_props(sport)
            except MarketDataError as exc:
                result["failures"].append(
                    {"sport": sport, "feed": "props", "error": str(exc)}
                )
            else:
                result["props"].extend(
                    row
                    for row in sport_rows
                    if isinstance(row, dict)
                    and (not row.get("sport_key") or row.get("sport_key") == sport)
                )
            try:
                sport_events = self.client.get_game_odds(sport)
            except MarketDataError as exc:
                result["failures"].append(
                    {"sport": sport, "feed": "game_odds", "error": str(exc)}
                )
            else:
                result["games"].extend(
                    event
                    for event in sport_events
                    if isinstance(event, dict)
                    and (not event.get("sport_key") or event.get("sport_key") == sport)
                )
            return result

        # Three concurrent sports keep refresh latency practical without a
        # large free-tier request burst. Each sport still performs props then
        # game odds in order.
        with ThreadPoolExecutor(max_workers=min(3, max(1, len(sports)))) as executor:
            for result in executor.map(load_parlay_sport, sports):
                prop_rows.extend(result["props"])
                game_events.extend(result["games"])
                failures.extend(result["failures"])
                if result["props"] or result["games"]:
                    loaded_sports.append(result["sport"])

        target_jobs = []
        if self.kalshi_client:
            target_jobs.extend(
                ("kalshi", sport, series_ticker, scope)
                for sport in sports
                for series_ticker, scope in KALSHI_SERIES.get(sport, ())
            )
        if self.polymarket_client:
            target_jobs.extend(
                ("polymarket", sport, series_id, None)
                for sport in sports
                if (series_id := POLYMARKET_SERIES.get(sport))
            )

        def load_target(job):
            provider, sport, identifier, scope = job
            if provider == "kalshi":
                events = self.kalshi_client.get_events(identifier)
                games, props = normalize_kalshi_events(sport, scope, events)
            else:
                events = self.polymarket_client.get_events(identifier)
                games, props = normalize_polymarket_events(sport, events)
            return games, props

        # These endpoints are public and do not consume Parlay credits, so
        # independent series can be read together.
        with ThreadPoolExecutor(
            max_workers=min(8, max(1, len(target_jobs)))
        ) as executor:
            future_jobs = {
                executor.submit(load_target, job): job for job in target_jobs
            }
            for future in as_completed(future_jobs):
                provider, sport, identifier, _ = future_jobs[future]
                try:
                    game_targets, prop_targets = future.result()
                except MarketDataError as exc:
                    failures.append(
                        {
                            "sport": sport,
                            "feed": f"{provider}:{identifier}",
                            "error": str(exc),
                        }
                    )
                    continue
                direct_game_targets.extend(game_targets)
                direct_prop_targets.extend(prop_targets)

        if not loaded_sports and failures:
            raise MarketDataError(failures[0]["error"])

        game_events, prop_rows = merge_direct_targets(
            game_events,
            prop_rows,
            direct_game_targets,
            direct_prop_targets,
        )
        opportunities = [
            *build_game_opportunities(game_events),
            *build_prop_opportunities(prop_rows),
        ]
        opportunities.sort(
            key=lambda item: (
                item["ev"]["value"],
                item["evaluation"]["hitProbability"],
                item["evaluation"]["rankScore"],
            ),
            reverse=True,
        )
        snapshot = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_complete": not failures,
            "loaded_sports": loaded_sports,
            "failed_sports": sorted({item["sport"] for item in failures}),
            "opportunities": opportunities,
        }
        # No timeout: a new upstream request happens only on an explicit refresh,
        # or once after a backend restart when no snapshot exists yet.
        cache.set(self.cache_key, snapshot, timeout=None)
        return snapshot

    def snapshot(self, force_refresh=False):
        snapshot = cache.get(self.cache_key)
        if snapshot is not None and not force_refresh:
            return snapshot
        with self._refresh_lock:
            if not force_refresh:
                snapshot = cache.get(self.cache_key)
                if snapshot is not None:
                    return snapshot
            return self._refresh()

    def list(self, params, force_refresh=False):
        snapshot = self.snapshot(force_refresh=force_refresh)
        platform = params.get("platform", "").lower()
        market_type = params.get("market_type", "").lower()
        category = params.get("category", "").lower()
        search = params.get("search", "").strip().lower()
        try:
            min_ev = max(0.0, float(params.get("min_ev", settings.MARKET_DATA_MIN_EV_PERCENT)))
        except (TypeError, ValueError):
            min_ev = settings.MARKET_DATA_MIN_EV_PERCENT
        try:
            min_probability = max(
                settings.MARKET_DATA_MIN_HIT_PROBABILITY_PERCENT,
                min(100.0, float(params.get("min_probability", 30))),
            )
        except (TypeError, ValueError):
            min_probability = settings.MARKET_DATA_MIN_HIT_PROBABILITY_PERCENT

        results = []
        for item in snapshot["opportunities"]:
            meta = item["_meta"]
            if platform and meta["platform"] != platform:
                continue
            if market_type and meta["market_type"] != market_type:
                continue
            if category and meta["sport"] != category:
                continue
            if search and search not in meta["search"]:
                continue
            if item["ev"]["value"] < min_ev:
                continue
            if item["evaluation"]["hitProbability"] < min_probability:
                continue
            results.append({key: value for key, value in item.items() if not key.startswith("_")})

        return {
            "live": {
                "isLive": snapshot["is_complete"],
                "updatedAt": snapshot["updated_at"],
                "source": "ParlayAPI + Kalshi + Polymarket",
                "sportsLoaded": snapshot["loaded_sports"],
                "sportsFailed": snapshot["failed_sports"],
            },
            "results": results,
        }

    def detail(self, opportunity_id):
        snapshot = cache.get(self.cache_key)
        if snapshot is None:
            return None
        for item in snapshot["opportunities"]:
            if item["id"] == opportunity_id:
                return item["_detail"]
        return None


def filter_config():
    configured_sports = [sport for sport in settings.MARKET_DATA_SPORTS if sport in SPORTS]
    return {
        "categories": [
            {"id": "", "label": "All"},
            *[{"id": sport, "label": SPORTS[sport]["label"]} for sport in configured_sports],
        ],
        "filters": [
            {
                "id": "platform",
                "label": "All platforms",
                "options": [
                    {"value": "kalshi", "label": "Kalshi"},
                    {"value": "polymarket", "label": "Polymarket"},
                ],
            },
            {
                "id": "market_type",
                "label": "All market types",
                "options": [
                    {"value": "player_prop", "label": "Player props"},
                    {"value": "game_prop", "label": "Game props"},
                    {"value": "game_market", "label": "Game markets"},
                ],
            },
            {
                "id": "min_ev",
                "label": "Minimum EV",
                "options": [
                    {"value": "0", "label": "All +EV"},
                    {"value": "1", "label": "+1% or better"},
                    {"value": "3", "label": "+3% or better"},
                    {"value": "5", "label": "+5% or better"},
                    {"value": "10", "label": "+10% or better"},
                ],
            },
            {
                "id": "min_probability",
                "label": "Minimum hit chance",
                "options": [
                    {"value": "30", "label": "30% or higher"},
                    {"value": "40", "label": "40% or higher"},
                    {"value": "50", "label": "50% or higher"},
                    {"value": "60", "label": "60% or higher"},
                    {"value": "65", "label": "65% or higher"},
                ],
            },
        ],
    }


opportunity_service = OpportunityService(
    kalshi_client=KalshiAPIClient(),
    polymarket_client=PolymarketAPIClient(),
)
