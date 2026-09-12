export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-vantage-danger/40 bg-vantage-danger/10 px-5 py-10 text-center">
      <p className="text-sm text-vantage-text">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-vantage-border px-4 py-2 text-xs font-medium text-vantage-text hover:border-vantage-accent"
        >
          Try again
        </button>
      )}
    </div>
  )
}
