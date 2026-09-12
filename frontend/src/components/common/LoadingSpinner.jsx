export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-vantage-textDim">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-vantage-border border-t-vantage-accent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
