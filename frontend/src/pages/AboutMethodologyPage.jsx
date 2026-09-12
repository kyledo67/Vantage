export default function AboutMethodologyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-vantage-text">Methodology</h1>
        <p className="mt-1 text-sm text-vantage-textDim">
          How Vantage estimates whether a Kalshi or Polymarket sports contract may be priced
          below its market value.
        </p>
      </div>

      <Section title="1. Exact contract matching">
        We only compare a Kalshi or Polymarket contract to sportsbook markets that describe the
        exact same outcome: same sport, event, player (if applicable), statistic, period,
        threshold, and side. A 1.5-point prop is never compared to a 2.5-point prop, and a
        player prop is never compared to a game-level line.
      </Section>

      <Section title="2. Removing bookmaker margin">
        Sportsbook odds include a built-in margin ("vig"). We use a matching over/under pair from
        a sharp reference book (preferring Pinnacle) to back out a no-vig fair probability —
        the two sides' implied probabilities are normalized so they sum to 100%.
      </Section>

      <Section title="3. Executable prices, not midpoints">
        We calculate the price advantage using the actual best available executable price on
        Kalshi or Polymarket's order book — including a fee and slippage allowance — never a
        displayed midpoint that a trade couldn't actually be filled at.
      </Section>

      <Section title="4. Freshness and liquidity">
        Every opportunity shows how old its quotes are and how much depth exists at the
        displayed price. Stale, illiquid, suspended, or already-started contracts are excluded.
      </Section>

      <Section title="5. Confidence scoring">
        Confidence reflects how many sportsbooks contributed, whether Pinnacle was available,
        quote freshness, spread, liquidity, and how exact the contract match was.
      </Section>

      <Section title="6. Limitations">
        Estimates are not predictions and not guarantees of profit. Markets move, and a price
        advantage can disappear before you act on it. Vantage does not place trades and is not
        connected to your Kalshi, Polymarket, sportsbook, or DFS accounts. You remain responsible
        for confirming your own eligibility to trade on Kalshi or Polymarket.
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-vantage-text">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-vantage-textDim">{children}</p>
    </div>
  )
}
