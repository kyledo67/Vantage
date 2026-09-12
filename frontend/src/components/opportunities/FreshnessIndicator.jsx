import { formatFreshness } from '../../utils/format.js'

export default function FreshnessIndicator({ updatedAt }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-vantage-textDim">
      <span className="h-1.5 w-1.5 rounded-full bg-vantage-positive" />
      Updated {formatFreshness(updatedAt)}
    </span>
  )
}
