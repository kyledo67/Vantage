import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { MAX_PORTFOLIO_LEGS } from '../../utils/constants.js'

export default function AddToPortfolioButton({ opportunity }) {
  const { selectedContracts, addContract, removeContract } = usePortfolio()

  const isSelected = selectedContracts.some((c) => c.id === opportunity.id)
  const sameGameConflict =
    !isSelected && selectedContracts.some((c) => c.event === opportunity.event)
  const atCapacity = !isSelected && selectedContracts.length >= MAX_PORTFOLIO_LEGS

  if (isSelected) {
    return (
      <button
        type="button"
        onClick={() => removeContract(opportunity.id)}
        className="rounded-md border border-vantage-border px-4 py-2 text-sm font-medium text-vantage-text hover:border-vantage-danger hover:text-vantage-danger"
      >
        Remove from hypothetical portfolio
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        disabled={sameGameConflict || atCapacity}
        onClick={() => addContract(opportunity)}
        className="rounded-md bg-vantage-accent px-4 py-2 text-sm font-semibold text-vantage-ctaText disabled:cursor-not-allowed disabled:bg-vantage-border disabled:text-vantage-textDim"
      >
        Add to hypothetical portfolio
      </button>
      {sameGameConflict && (
        <p className="mt-1 text-xs text-vantage-alert">
          Same-game combinations aren't supported yet — correlation isn't modeled in the MVP.
        </p>
      )}
      {atCapacity && (
        <p className="mt-1 text-xs text-vantage-alert">
          Portfolio analysis supports up to {MAX_PORTFOLIO_LEGS} legs.
        </p>
      )}
    </div>
  )
}
