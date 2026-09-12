"""Conservative age and residence checks for supported prediction markets.

These checks are a pre-screen for Vantage. Kalshi and Polymarket remain the
authority on whether an individual can open an account or place a trade.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass


POLICY_CHECKED_ON = "2026-09-12"

# Kalshi Member Agreement, section VI, effective June 17, 2026.
# https://kalshi.com/docs/kalshi-member-agreement.pdf
KALSHI_RESTRICTED_COUNTRIES = frozenset(
    {
        "AF", "DZ", "AO", "AU", "BY", "BE", "BO", "BG", "BF", "CM",
        "CA", "CF", "CI", "CU", "CD", "ET", "FR", "HT", "HU", "IN",
        "IR", "IQ", "IE", "IT", "KE", "LA", "LB", "LY", "ML", "MC",
        "MZ", "MM", "NA", "NZ", "NI", "NE", "KP", "CN", "PL", "PT",
        "RU", "SG", "SO", "SS", "SD", "CH", "SY", "TW", "TH", "UA",
        "AE", "GB", "VE", "YE", "ZW",
    }
)

# Polymarket.com Geographic Restrictions, checked September 12, 2026.
# https://help.polymarket.com/en/articles/13364163-geographic-restrictions
POLYMARKET_RESTRICTED_COUNTRIES = frozenset(
    {
        "AU", "BE", "BY", "BR", "BI", "CF", "CD", "CU", "DE", "ET",
        "FR", "GB", "IE", "IR", "IQ", "IT", "JP", "KP", "LB", "LY",
        "MM", "MT", "NI", "NL", "NZ", "PL", "RU", "SG", "SK", "SO",
        "SS", "SD", "SY", "TW", "TH", "UM", "US", "VE", "YE", "ZW",
    }
)

POLYMARKET_RESTRICTED_SUBDIVISIONS = {
    "CA": frozenset(
        {
            "AB", "ALBERTA",
            "BC", "BRITISH COLUMBIA",
            "ON", "ONTARIO",
            "QC", "QUEBEC", "QUÉBEC",
        }
    ),
    "UA": frozenset(
        {
            "09", "14", "43",
            "CRIMEA", "DONETSK", "LUHANSK", "LUGANSK",
        }
    ),
}


@dataclass(frozen=True)
class EligibilityDecision:
    eligible: bool
    status: str
    reason: str

    def as_dict(self):
        return asdict(self)


def _normalize(value):
    return str(value or "").strip().upper()


def _pending(reason):
    return EligibilityDecision(False, "verification_required", reason)


def evaluate_platform_eligibility(
    *,
    is_age_verified: bool,
    residence_country_code: str,
    residence_subdivision: str = "",
):
    """Return conservative pre-screening decisions for each target platform."""

    if not is_age_verified:
        decision = _pending("Complete Persona identity and 18+ verification first.")
        return {"kalshi": decision, "polymarket": decision}

    country = _normalize(residence_country_code)
    subdivision = _normalize(residence_subdivision)
    if len(country) != 2 or not country.isalpha():
        decision = _pending(
            "Persona must provide a verified two-letter country of residence."
        )
        return {"kalshi": decision, "polymarket": decision}

    if country in KALSHI_RESTRICTED_COUNTRIES:
        kalshi = EligibilityDecision(
            False,
            "residence_restricted",
            "Kalshi currently restricts event-contract trading for this residence.",
        )
    else:
        kalshi = EligibilityDecision(
            True,
            "eligible",
            "Age and residence pass Vantage's current Kalshi pre-screen.",
        )

    if country in POLYMARKET_RESTRICTED_COUNTRIES:
        reason = "Polymarket.com currently restricts trading from this country."
        if country == "US":
            reason += " U.S. users must check the separate Polymarket US product."
        polymarket = EligibilityDecision(False, "residence_restricted", reason)
    elif country in POLYMARKET_RESTRICTED_SUBDIVISIONS and not subdivision:
        polymarket = EligibilityDecision(
            False,
            "region_verification_required",
            "Polymarket restrictions vary by region in this country; Persona must provide the residence region.",
        )
    elif subdivision in POLYMARKET_RESTRICTED_SUBDIVISIONS.get(country, ()):
        polymarket = EligibilityDecision(
            False,
            "residence_restricted",
            "Polymarket.com currently restricts trading from this region.",
        )
    else:
        polymarket = EligibilityDecision(
            True,
            "eligible",
            "Age and residence pass Vantage's current Polymarket.com pre-screen.",
        )

    return {"kalshi": kalshi, "polymarket": polymarket}


def serialize_profile_eligibility(profile):
    decisions = evaluate_platform_eligibility(
        is_age_verified=profile.is_age_verified,
        residence_country_code=profile.residence_country_code,
        residence_subdivision=profile.residence_subdivision,
    )
    eligible_markets = [
        platform for platform, decision in decisions.items() if decision.eligible
    ]
    selected_markets = (
        ["kalshi", "polymarket"]
        if profile.markets == profile.MarketChoice.BOTH
        else [profile.markets]
    )
    return {
        "is_eligible": any(
            decisions[platform].eligible for platform in selected_markets
        ),
        "is_residence_verified": bool(
            profile.is_age_verified and profile.residence_country_code
        ),
        "eligible_markets": eligible_markets,
        "platforms": {
            platform: decision.as_dict()
            for platform, decision in decisions.items()
        },
        "policy_checked_on": POLICY_CHECKED_ON,
        "disclaimer": (
            "This is a preliminary age-and-residence check. Each platform makes the final decision and may also use current physical location."
        ),
    }
