import { formatPercent, formatSignedCents } from '../../utils/format.js'

export default function PriceAdvantageTag({ priceAdvantageDecimal, estimatedRoi }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-sm font-semibold text-vantage-positive">
        {formatSignedCents(priceAdvantageDecimal)} advantage
      </span>
      <span className="text-xs text-vantage-textDim">
        Est. ROI {formatPercent(estimatedRoi, { signed: true })}
      </span>
    </div>
  )
}
