export default function ExplanationPanel({ explanation }) {
  return (
    <div className="rounded-lg border border-vantage-border bg-vantage-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-vantage-text">Why this may be favorable</h2>
      <p className="text-sm leading-relaxed text-vantage-textDim">{explanation}</p>
      <p className="mt-3 text-xs italic text-vantage-textDim">
        This is an estimate, not a guarantee. Prices, liquidity, and resolution risk can change
        before you act.
      </p>
    </div>
  )
}
