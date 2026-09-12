const STEPS = [
  { id: 'eligibility', label: 'Confirm eligibility' },
  { id: 'persona', label: 'Verify identity' },
  { id: 'complete', label: 'Complete' },
]

/** Simple 3-step indicator — current and completed steps read in purple,
 *  everything ahead stays muted. Purely presentational; step order and
 *  gating live in the page that renders this. */
export default function VerificationProgress({ currentStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep)

  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Verification progress">
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                aria-hidden="true"
                className={`h-1.5 w-full rounded-full transition-colors duration-200 ${
                  isComplete || isCurrent ? 'bg-vantage-accent' : 'bg-vantage-border'
                }`}
              />
              <span
                className={`hidden truncate text-xs sm:block ${
                  isCurrent
                    ? 'font-medium text-vantage-text'
                    : isComplete
                      ? 'text-vantage-textDim'
                      : 'text-vantage-textDim/50'
                }`}
              >
                {`${index + 1}. ${step.label}`}
              </span>
              <span className="sr-only">
                Step {index + 1} of {STEPS.length}: {step.label}
                {isCurrent ? ' (current)' : isComplete ? ' (complete)' : ''}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
