import { Link } from 'react-router-dom'
import { formatCents, formatPercent } from '../../utils/format.js'

export default function SelectedContractRow({ contract, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-vantage-border bg-vantage-surface p-3">
      <div>
        <Link to={`/ev-finder/${contract.id}`} className="text-sm font-medium text-vantage-text hover:underline">
          {contract.title}
        </Link>
        <p className="text-xs text-vantage-textDim">
          {contract.platform} · {contract.event}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-vantage-textDim">
        <span>Price {formatCents(contract.executablePriceDecimal)}</span>
        <span>Fair {formatCents(contract.fairProbability)}</span>
        <span>ROI {formatPercent(contract.estimatedRoi, { signed: true })}</span>
        <button
          type="button"
          onClick={() => onRemove(contract.id)}
          className="rounded border border-vantage-border px-2 py-1 text-vantage-text hover:border-vantage-danger hover:text-vantage-danger"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
