import { memberBenefits } from './data.js'

export default function MemberBenefits() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memberBenefits.map((item) => (
        <div key={item.id} className="rounded-xl border border-vantage-border bg-vantage-surface p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-vantage-accent/15 text-vantage-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-medium text-vantage-text">{item.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-vantage-textDim">{item.description}</p>
        </div>
      ))}
    </div>
  )
}
