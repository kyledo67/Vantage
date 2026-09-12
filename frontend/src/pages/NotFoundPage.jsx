import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold text-vantage-text">Page not found</h1>
      <p className="text-sm text-vantage-textDim">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-sm text-vantage-accent hover:underline">
        Back to home
      </Link>
    </div>
  )
}
