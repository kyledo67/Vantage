export default function BenchmarkSourcesPanel({ contributingBooks }) {
  return (
    <div className="rounded-lg border border-vantage-border bg-vantage-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-vantage-text">What the broader market thinks</h2>
      <p className="mb-2 text-xs text-vantage-textDim">Based on:</p>
      <ul className="flex flex-wrap gap-2">
        {contributingBooks.map((book) => (
          <li
            key={book}
            className="rounded-full border border-vantage-border px-2.5 py-1 text-xs text-vantage-text"
          >
            {book}
          </li>
        ))}
      </ul>
    </div>
  )
}
