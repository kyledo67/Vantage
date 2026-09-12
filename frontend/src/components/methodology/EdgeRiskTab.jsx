export default function EdgeRiskTab() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-vantage-text sm:text-2xl">What is an edge?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-vantage-textDim">
          An edge means you may be getting a better price than the wider market suggests.
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-xl border border-vantage-border bg-vantage-surface p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-vantage-textDim">Available price</p>
          <p className="mt-1 text-2xl font-semibold text-vantage-text">42¢</p>
        </div>
        <span className="hidden justify-self-center text-sm text-vantage-textDim sm:block">vs</span>
        <div className="rounded-xl border border-vantage-border bg-vantage-surface p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-vantage-textDim">
            Broader market estimate
          </p>
          <p className="mt-1 text-2xl font-semibold text-vantage-text">49¢</p>
        </div>
        <span className="hidden justify-self-center text-sm text-vantage-textDim sm:block">=</span>
        <div className="rounded-xl border border-vantage-accent/40 bg-vantage-raised p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-vantage-alert">Potential edge</p>
          <p className="mt-1 text-2xl font-semibold text-vantage-positive">+7¢</p>
        </div>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-vantage-textDim">
        If something is available for 42 cents while the wider market suggests it may be worth
        closer to 49 cents, the 42-cent price could be a better deal.
      </p>

      <div className="rounded-xl border border-vantage-danger/40 bg-vantage-danger/5 px-4 py-3">
        <p className="text-xs font-medium leading-relaxed text-vantage-text">
          An edge does not mean the outcome will happen. It only means the current price may be
          better than expected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-vantage-border bg-vantage-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-vantage-alert">
            It can mean
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-vantage-textDim">
            <li>The available price may be favorable.</li>
            <li>The broader market may imply a higher value.</li>
            <li>The opportunity may be worth researching.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-vantage-border bg-vantage-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-vantage-textDim">
            It does not mean
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-vantage-textDim">
            <li>A guaranteed win.</li>
            <li>A prediction of the future.</li>
            <li>Risk-free profit.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-vantage-accentEnd/40 bg-vantage-raised p-5">
        <h3 className="text-sm font-semibold text-vantage-text">Risk reminder</h3>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-vantage-textDim">
          Short-term outcomes can vary widely. Vantage helps explain prices, but every position
          carries risk.
        </p>
      </div>
    </div>
  )
}
