import { formatPercent } from '../../utils/format.js'

// Independent-leg joint probability: P(all resolve YES) = p1 * p2 * ... * pn.
// This assumes the legs are truly independent (enforced upstream by rejecting
// same-game selections) — it is not valid for correlated outcomes.
export default function JointProbabilitySummary({ contracts }) {
  if (contracts.length === 0) return null

  const jointProbability = contracts.reduce((acc, c) => acc * c.fairProbability, 1)

  return (
    <div className="rounded-lg border border-vantage-border bg-vantage-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-vantage-text">Estimated joint probability</h2>
      <p className="text-2xl font-semibold text-vantage-positive">
        {formatPercent(jointProbability)}
      </p>
      <p className="mt-1 text-xs text-vantage-textDim">
        Based on {contracts.length} independent, cross-game selection
        {contracts.length > 1 ? 's' : ''}. This is not a guarantee — it assumes each leg's
        outcome is unrelated to the others.
      </p>
    </div>
  )
}
