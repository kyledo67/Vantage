import { Link } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import SelectedContractRow from '../components/portfolio/SelectedContractRow.jsx'
import JointProbabilitySummary from '../components/portfolio/JointProbabilitySummary.jsx'
import RiskNote from '../components/portfolio/RiskNote.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { MIN_PORTFOLIO_LEGS } from '../utils/constants.js'

export default function PortfolioPage() {
  const { selectedContracts, removeContract, clearPortfolio } = usePortfolio()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-vantage-text">Hypothetical portfolio</h1>
          <p className="text-sm text-vantage-textDim">
            Combine up to 4 independent, cross-game contracts to see joint probability and risk.
          </p>
        </div>
        {selectedContracts.length > 0 && (
          <button
            type="button"
            onClick={clearPortfolio}
            className="rounded-md border border-vantage-border px-3 py-1.5 text-xs text-vantage-textDim hover:text-vantage-text"
          >
            Clear all
          </button>
        )}
      </div>

      {selectedContracts.length === 0 && (
        <EmptyState
          title="No contracts selected"
          description="Add contracts from the opportunity feed to build a hypothetical portfolio analysis."
        />
      )}

      {selectedContracts.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {selectedContracts.map((contract) => (
              <SelectedContractRow key={contract.id} contract={contract} onRemove={removeContract} />
            ))}
          </div>

          {selectedContracts.length < MIN_PORTFOLIO_LEGS && (
            <p className="text-xs text-vantage-textDim">
              Add at least {MIN_PORTFOLIO_LEGS} contracts to see a joint probability analysis.
            </p>
          )}

          {selectedContracts.length >= MIN_PORTFOLIO_LEGS && (
            <JointProbabilitySummary contracts={selectedContracts} />
          )}

          <RiskNote />
        </>
      )}

      <Link to="/ev-finder" className="text-xs text-vantage-accent hover:underline">
        + Add another contract
      </Link>
    </div>
  )
}
