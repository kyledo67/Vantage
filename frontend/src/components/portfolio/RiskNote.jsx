export default function RiskNote() {
  return (
    <div className="rounded-lg border border-vantage-alert/40 bg-vantage-alert/10 p-4 text-xs text-vantage-text">
      <p className="font-medium">Risk and assumptions</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-vantage-textDim">
        <li>This portfolio view is hypothetical — Vantage does not place trades.</li>
        <li>Only independent, cross-game selections are combined; same-game legs are rejected.</li>
        <li>
          If Kalshi or Polymarket offers a real combination product for these legs, its actual
          quoted price, fees, and settlement terms may differ from this estimate.
        </li>
        <li>Estimates use executable prices at the time of this analysis and can go stale quickly.</li>
      </ul>
    </div>
  )
}
