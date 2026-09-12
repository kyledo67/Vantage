import { useParams, Link } from 'react-router-dom'
import { useOpportunityDetail } from '../hooks/useOpportunityDetail.js'
import ContractHeader from '../components/contract/ContractHeader.jsx'
import OrderBookPanel from '../components/contract/OrderBookPanel.jsx'
import BenchmarkSourcesPanel from '../components/contract/BenchmarkSourcesPanel.jsx'
import ExplanationPanel from '../components/contract/ExplanationPanel.jsx'
import AddToPortfolioButton from '../components/contract/AddToPortfolioButton.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorState from '../components/common/ErrorState.jsx'

export default function ContractDetailPage() {
  const { id } = useParams()
  const { data: opportunity, status, error, refetch } = useOpportunityDetail(id)

  if (status === 'loading' || status === 'idle') {
    return <LoadingSpinner label="Loading contract…" />
  }

  if (status === 'error') {
    return <ErrorState message={error?.message || 'Could not load this contract.'} onRetry={refetch} />
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/ev-finder" className="text-xs text-vantage-textDim hover:text-vantage-text">
        ← Back to EV Finder
      </Link>

      <ContractHeader opportunity={opportunity} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OrderBookPanel opportunity={opportunity} />
        <BenchmarkSourcesPanel contributingBooks={opportunity.contributingBooks} />
      </div>

      <ExplanationPanel explanation={opportunity.explanation} />

      <AddToPortfolioButton opportunity={opportunity} />
    </div>
  )
}
