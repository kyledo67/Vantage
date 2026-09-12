import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation


KALSHI_SERIES = {
    "baseball_mlb": (
        ("KXMLBGAME", "game"),
        ("KXMLBSPREAD", "spreads"),
        ("KXMLBTOTAL", "totals"),
        ("KXMLBTEAMTOTAL", "team_totals"),
    ),
    "americanfootball_nfl": (
        ("KXNFLGAME", "game"),
        ("KXNFLSPREAD", "spreads"),
        ("KXNFLTOTAL", "totals"),
        ("KXNFLTEAMTOTAL", "team_totals"),
    ),
    "basketball_nba": (
        ("KXNBAGAME", "game"),
        ("KXNBASPREAD", "spreads"),
        ("KXNBATOTAL", "totals"),
        ("KXNBATEAMTOTAL", "team_totals"),
    ),
    "icehockey_nhl": (
        ("KXNHLGAME", "game"),
        ("KXNHLSPREAD", "spreads"),
        ("KXNHLTOTAL", "totals"),
    ),
    "basketball_wnba": (
        ("KXWNBAGAME", "game"),
        ("KXWNBASPREAD", "spreads"),
        ("KXWNBATOTAL", "totals"),
        ("KXWNBATEAMTOTAL", "team_totals"),
    ),
    "soccer_epl": (
        ("KXEPLGAME", "game"),
        ("KXEPLSPREAD", "spreads"),
        ("KXEPLTOTAL", "totals"),
        ("KXEPLTEAMTOTAL", "team_totals"),
        ("KXEPLBTTS", "both_teams_to_score"),
        ("KXEPLCORNERS", "total_corners"),
    ),
}

POLYMARKET_SERIES = {
    "baseball_mlb": "3",
    "americanfootball_nfl": "10187",
    "basketball_nba": "10345",
    "icehockey_nhl": "10346",
    "basketball_wnba": "10105",
    "soccer_epl": "10188",
}

POLYMARKET_MARKET_ALIASES = {
    "soccer_team_totals": "team_totals",
    "game_team_totals": "team_totals",
    "both_teams_to_score": "both_teams_to_score",
}

TEAM_STOP_WORDS = {"afc", "cf", "club", "fc", "football"}
MONTHS = {
    name: number
    for number, name in enumerate(
        (
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
        ),
        1,
    )
}


def probability_to_american(value):
    try:
        probability = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if probability <= 0 or probability >= 1:
        return None
    if probability < Decimal("0.5"):
        return int(
            (
                Decimal("100")
                * (Decimal("1") - probability)
                / probability
            ).quantize(Decimal("1"))
        )
    return int(
        (
            Decimal("-100")
            * probability
            / (Decimal("1") - probability)
        ).quantize(Decimal("1"))
    )


def _price(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if 0 < number < 1 else None


def _parse_json_list(value):
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value or "[]")
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def _team_key(value):
    value = re.sub(r"\([^)]*\)", " ", str(value or "").lower())
    tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", value)
        if token not in TEAM_STOP_WORDS
    ]
    return " ".join(tokens)


def _team_match(left, right):
    left_key = _team_key(left)
    right_key = _team_key(right)
    if not left_key or not right_key:
        return False
    if left_key == right_key:
        return True
    left_tokens = left_key.split()
    right_tokens = right_key.split()
    if set(left_tokens).issubset(right_tokens) or set(right_tokens).issubset(left_tokens):
        return True
    if len(left_tokens) == len(right_tokens) and len(left_tokens) > 1:
        return (
            left_tokens[:-1] == right_tokens[:-1]
            and left_tokens[-1][0] == right_tokens[-1][0]
        )
    return False


def _teams_match(target_teams, left, right):
    if len(target_teams) != 2:
        return False
    first, second = target_teams
    return (
        _team_match(first, left) and _team_match(second, right)
    ) or (
        _team_match(first, right) and _team_match(second, left)
    )


def _split_teams(title):
    value = re.sub(
        r"\s+-\s+More Markets\s*$", "", str(title or ""), flags=re.I
    )
    pieces = value.split(":")
    segment = next(
        (piece for piece in pieces if re.search(r"\s+vs\.?\s+", piece, re.I)),
        value,
    )
    segment = re.sub(
        r"\s*:\s*(?:Total|Spread|BTTS|Team Total).*$", "", segment, flags=re.I
    )
    teams = re.split(r"\s+vs\.?\s+", segment, maxsplit=1, flags=re.I)
    return tuple(team.strip() for team in teams) if len(teams) == 2 else ()


def _kalshi_event_date(event):
    match = re.search(
        r"\(([A-Za-z]{3})\s+(\d{1,2})\)", str(event.get("sub_title") or "")
    )
    if not match:
        return None
    month = MONTHS.get(match.group(1).lower())
    if not month:
        return None
    now = datetime.now(timezone.utc)
    candidate = datetime(
        now.year, month, int(match.group(2)), tzinfo=timezone.utc
    ).date()
    if (candidate - now.date()).days < -180:
        candidate = candidate.replace(year=now.year + 1)
    return candidate


def _parse_time(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _target_book(platform, markets, link, updated_at):
    return {
        "key": platform,
        "title": "Kalshi" if platform == "kalshi" else "Polymarket",
        "stale_seconds": 0,
        "last_update": updated_at,
        "link": link,
        "markets": markets,
    }


def _opposing_team(teams, selected):
    return next((team for team in teams if not _team_match(team, selected)), None)


def normalize_kalshi_events(sport, scope, events):
    game_targets = []
    prop_targets = []
    now = datetime.now(timezone.utc).isoformat()

    for event in events:
        if not isinstance(event, dict):
            continue
        teams = _split_teams(event.get("title"))
        if len(teams) != 2:
            continue
        event_date = _kalshi_event_date(event)
        series = event.get("series_ticker") or ""
        link = f"https://kalshi.com/markets/{str(series).lower()}"
        markets = [
            market
            for market in event.get("markets", [])
            if isinstance(market, dict)
            and market.get("status") in {None, "active", "open"}
        ]

        if scope == "game":
            outcomes = []
            for market in markets:
                price = probability_to_american(
                    _price(market.get("yes_ask_dollars"))
                )
                name = market.get("yes_sub_title")
                if price is not None and name:
                    outcomes.append(
                        {
                            "name": "Draw" if str(name).lower() == "tie" else name,
                            "price": price,
                        }
                    )
            if len(outcomes) >= 2:
                game_targets.append(
                    {
                        "sport_key": sport,
                        "teams": teams,
                        "event_date": event_date,
                        "kind": "standard",
                        "platform": "kalshi",
                        "book": _target_book(
                            "kalshi",
                            [
                                {
                                    "key": "h2h",
                                    "last_update": now,
                                    "outcomes": outcomes,
                                }
                            ],
                            link,
                            now,
                        ),
                    }
                )
            continue

        if scope in {"spreads", "totals", "total_corners"}:
            normalized_markets = []
            for market in markets:
                yes_price = probability_to_american(
                    _price(market.get("yes_ask_dollars"))
                )
                no_price = probability_to_american(
                    _price(market.get("no_ask_dollars"))
                )
                point = market.get("floor_strike")
                if yes_price is None or no_price is None or point is None:
                    continue
                if scope == "spreads":
                    subtitle = str(market.get("yes_sub_title") or "")
                    selected = re.split(
                        r"\s+wins?\b", subtitle, maxsplit=1, flags=re.I
                    )[0].strip()
                    opposing = _opposing_team(teams, selected)
                    if not selected or not opposing:
                        continue
                    outcomes = [
                        {
                            "name": selected,
                            "point": -float(point),
                            "price": yes_price,
                        },
                        {
                            "name": opposing,
                            "point": float(point),
                            "price": no_price,
                        },
                    ]
                    market_key = "spreads"
                    description = "Spread"
                else:
                    outcomes = [
                        {
                            "name": "Over",
                            "point": float(point),
                            "price": yes_price,
                        },
                        {
                            "name": "Under",
                            "point": float(point),
                            "price": no_price,
                        },
                    ]
                    market_key = "totals"
                    description = (
                        "Total Corners" if scope == "total_corners" else "Total"
                    )
                normalized_markets.append(
                    {
                        "key": market_key,
                        "description": description,
                        "last_update": now,
                        "outcomes": outcomes,
                    }
                )
            if normalized_markets:
                game_targets.append(
                    {
                        "sport_key": sport,
                        "teams": teams,
                        "event_date": event_date,
                        "kind": (
                            "corners" if scope == "total_corners" else "standard"
                        ),
                        "platform": "kalshi",
                        "book": _target_book(
                            "kalshi", normalized_markets, link, now
                        ),
                    }
                )
            continue

        if scope in {"team_totals", "both_teams_to_score"}:
            for market in markets:
                yes_price = probability_to_american(
                    _price(market.get("yes_ask_dollars"))
                )
                no_price = probability_to_american(
                    _price(market.get("no_ask_dollars"))
                )
                if yes_price is None or no_price is None:
                    continue
                if scope == "team_totals":
                    subtitle = str(market.get("yes_sub_title") or "")
                    player = re.split(
                        r"\s+over\s+", subtitle, maxsplit=1, flags=re.I
                    )[0].strip()
                    line = market.get("floor_strike")
                    if not player or line is None:
                        continue
                    market_key = "team_totals"
                    label = "Team Total"
                else:
                    player = f"{teams[0]} vs {teams[1]}"
                    line = None
                    market_key = "both_teams_to_score"
                    label = "Both Teams To Score"
                prop_targets.append(
                    {
                        "sport_key": sport,
                        "teams": teams,
                        "event_date": event_date,
                        "source": "kalshi",
                        "source_title": "Kalshi",
                        "player_name": player,
                        "market_key": market_key,
                        "market_label": label,
                        "line": line,
                        "over_price": yes_price,
                        "under_price": no_price,
                        "snapshot_time": now,
                        "age_seconds": 0,
                        "url": link,
                    }
                )
    return game_targets, prop_targets


def _polymarket_prices(market):
    best_ask = _price(market.get("bestAsk"))
    best_bid = _price(market.get("bestBid"))
    if best_ask is None or best_bid is None:
        return None, None
    return best_ask, 1 - best_bid


def normalize_polymarket_events(sport, events):
    game_targets = []
    prop_targets = []
    now = datetime.now(timezone.utc).isoformat()

    for event in events:
        if not isinstance(event, dict):
            continue
        teams = _split_teams(event.get("title"))
        if len(teams) != 2:
            continue
        commence = _parse_time(event.get("endDate"))
        event_date = commence.date() if commence else None
        slug = event.get("slug")
        link = (
            f"https://polymarket.com/event/{slug}"
            if slug
            else "https://polymarket.com/sports"
        )
        h2h_outcomes = []
        direct_markets = []

        for market in event.get("markets", []):
            if (
                not isinstance(market, dict)
                or market.get("closed") is True
                or market.get("active") is False
            ):
                continue
            market_type = str(market.get("sportsMarketType") or "")
            ask_first, ask_second = _polymarket_prices(market)
            first_price = probability_to_american(ask_first)
            second_price = probability_to_american(ask_second)
            if first_price is None or second_price is None:
                continue
            outcomes = _parse_json_list(market.get("outcomes"))

            if market_type == "moneyline":
                if (
                    len(outcomes) == 2
                    and {str(value).lower() for value in outcomes} != {"yes", "no"}
                ):
                    h2h_outcomes.extend(
                        [
                            {"name": outcomes[0], "price": first_price},
                            {"name": outcomes[1], "price": second_price},
                        ]
                    )
                else:
                    question = str(market.get("question") or "")
                    if "end in a draw" in question.lower():
                        selection = "Draw"
                    else:
                        match = re.search(r"Will\s+(.+?)\s+win\b", question, re.I)
                        selection = match.group(1).strip() if match else None
                    if selection:
                        h2h_outcomes.append(
                            {"name": selection, "price": first_price}
                        )
                continue

            if (
                market_type in {"spreads", "totals", "total_corners"}
                and len(outcomes) == 2
            ):
                point = market.get("line")
                if point is None:
                    continue
                if market_type == "spreads":
                    outcome_points = (float(point), -float(point))
                    description = "Spread"
                    key = "spreads"
                else:
                    outcome_points = (float(point), float(point))
                    description = (
                        "Total Corners" if market_type == "total_corners" else "Total"
                    )
                    key = "totals"
                direct_markets.append(
                    {
                        "key": key,
                        "description": description,
                        "last_update": now,
                        "outcomes": [
                            {
                                "name": outcomes[0],
                                "point": outcome_points[0],
                                "price": first_price,
                            },
                            {
                                "name": outcomes[1],
                                "point": outcome_points[1],
                                "price": second_price,
                            },
                        ],
                    }
                )
                continue

            canonical_type = POLYMARKET_MARKET_ALIASES.get(market_type)
            if canonical_type and len(outcomes) == 2:
                if canonical_type == "team_totals":
                    question = str(market.get("question") or "")
                    team_match = re.search(
                        r":\s*(.+?)\s+O/U\s+[-+]?\d", question, re.I
                    )
                    named_team = team_match.group(1).strip() if team_match else ""
                    player = next(
                        (team for team in teams if _team_match(team, named_team)),
                        None,
                    )
                    line = market.get("line")
                    if not player or line is None:
                        continue
                    label = "Team Total"
                else:
                    player = f"{teams[0]} vs {teams[1]}"
                    line = None
                    label = "Both Teams To Score"
                prop_targets.append(
                    {
                        "sport_key": sport,
                        "teams": teams,
                        "event_date": event_date,
                        "source": "polymarket",
                        "source_title": "Polymarket",
                        "player_name": player,
                        "market_key": canonical_type,
                        "market_label": label,
                        "line": line,
                        "over_price": first_price,
                        "under_price": second_price,
                        "snapshot_time": now,
                        "age_seconds": 0,
                        "url": link,
                    }
                )

        if len(h2h_outcomes) >= 2:
            unique = {}
            for outcome in h2h_outcomes:
                unique[_team_key(outcome["name"])] = outcome
            direct_markets.append(
                {
                    "key": "h2h",
                    "last_update": now,
                    "outcomes": list(unique.values()),
                }
            )
        if direct_markets:
            game_targets.append(
                {
                    "sport_key": sport,
                    "teams": teams,
                    "event_date": event_date,
                    "kind": (
                        "corners"
                        if all(
                            market.get("description") == "Total Corners"
                            for market in direct_markets
                        )
                        else "standard"
                    ),
                    "platform": "polymarket",
                    "book": _target_book(
                        "polymarket", direct_markets, link, now
                    ),
                }
            )
    return game_targets, prop_targets


def _is_corner_event(event):
    return "(corners)" in str(event.get("home_team") or "").lower() or (
        "(corners)" in str(event.get("away_team") or "").lower()
    )


def _date_matches(target_date, value):
    parsed = _parse_time(value)
    return target_date is None or parsed is None or parsed.date() == target_date


def _same_line(left, right):
    try:
        return abs(float(left) - float(right)) < 0.001
    except (TypeError, ValueError):
        return left is None and right is None


def _same_direct_prop(existing, target):
    source = str(existing.get("source") or existing.get("bookmaker") or "").lower()
    market_key = POLYMARKET_MARKET_ALIASES.get(
        str(existing.get("market_key") or ""),
        str(existing.get("market_key") or ""),
    )
    if (
        source != target.get("source")
        or existing.get("sport_key") != target.get("sport_key")
        or market_key != target.get("market_key")
        or not _same_line(existing.get("line"), target.get("line"))
        or not _teams_match(
            target.get("teams", ()),
            existing.get("home_team"),
            existing.get("away_team"),
        )
        or not _date_matches(target.get("event_date"), existing.get("commence_time"))
    ):
        return False
    if market_key == "team_totals":
        return _team_match(
            existing.get("player_name") or existing.get("player"),
            target.get("player_name") or target.get("player"),
        )
    return True


def merge_direct_targets(game_events, prop_rows, game_targets, prop_targets):
    """Attach direct executable target quotes to matching Parlay reference rows."""
    merged_events = deepcopy(game_events)
    grouped = {}

    for target in game_targets:
        match_index = next(
            (
                index
                for index, event in enumerate(merged_events)
                if event.get("sport_key") == target.get("sport_key")
                and _teams_match(
                    target.get("teams", ()),
                    event.get("home_team"),
                    event.get("away_team"),
                )
                and _date_matches(
                    target.get("event_date"), event.get("commence_time")
                )
                and _is_corner_event(event) == (target.get("kind") == "corners")
            ),
            None,
        )
        if match_index is None:
            continue
        group_key = (match_index, target["platform"])
        if group_key not in grouped:
            grouped[group_key] = deepcopy(target["book"])
        else:
            grouped[group_key]["markets"].extend(
                deepcopy(target["book"]["markets"])
            )

    for (event_index, platform), book in grouped.items():
        event = merged_events[event_index]
        event["bookmakers"] = [
            existing
            for existing in event.get("bookmakers", [])
            if str(existing.get("key") or "").lower() != platform
        ]
        event["bookmakers"].append(book)

    merged_props = list(prop_rows)
    for target in prop_targets:
        reference = next(
            (
                row
                for row in prop_rows
                if row.get("sport_key") == target.get("sport_key")
                and _teams_match(
                    target.get("teams", ()),
                    row.get("home_team"),
                    row.get("away_team"),
                )
                and _date_matches(
                    target.get("event_date"), row.get("commence_time")
                )
            ),
            None,
        )
        if reference is None:
            continue
        attached = dict(target)
        attached.update(
            {
                "event_id": reference.get("event_id"),
                "canonical_event_id": reference.get("canonical_event_id"),
                "home_team": reference.get("home_team"),
                "away_team": reference.get("away_team"),
                "commence_time": reference.get("commence_time"),
            }
        )
        attached.pop("teams", None)
        attached.pop("event_date", None)
        merged_props = [
            row for row in merged_props if not _same_direct_prop(row, target)
        ]
        merged_props.append(attached)
    return merged_events, merged_props
