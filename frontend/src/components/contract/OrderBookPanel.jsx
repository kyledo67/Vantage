import { formatCents, formatSignedCents } from '../../utils/format.js'

export default function OrderBookPanel({ opportunity }) {
  const { executablePriceDecimal, fairProbability, priceAdvantageDecimal, liquidity, spread, side } =
    opportunity

  return (
    <div className="rounded-lg border border-vantage-border bg-vantage-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-vantage-text">Executable price</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-vantage-textDim">Side</dt>
        <dd className="text-right uppercase text-vantage-text">{side}</dd>

        <dt className="text-vantage-textDim">Executable price</dt>
        <dd className="text-right font-medium text-vantage-text">
          {formatCents(executablePriceDecimal)}
        </dd>

        <dt className="text-vantage-textDim">Estimated market value</dt>
        <dd className="text-right text-vantage-text">{formatCents(fairProbability)}</dd>

        <dt className="text-vantage-textDim">Estimated price advantage</dt>
        <dd className="text-right font-medium text-vantage-positive">
          {formatSignedCents(priceAdvantageDecimal)}
        </dd>

        <dt className="text-vantage-textDim">Spread</dt>
        <dd className="text-right text-vantage-text">{formatCents(spread)}</dd>

        <dt className="text-vantage-textDim">Liquidity</dt>
        <dd className="text-right capitalize text-vantage-text">{liquidity}</dd>
      </dl>
    </div>
  )
}
