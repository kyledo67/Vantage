export default function EmptyState({ title = 'Nothing here yet', description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-vantage-border px-4 py-12 text-center">
      <p className="text-sm font-medium text-vantage-text">{title}</p>
      {description && <p className="max-w-sm text-xs text-vantage-textDim">{description}</p>}
    </div>
  )
}
