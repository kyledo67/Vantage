// Decorative blurred color blobs used behind hero/auth content to keep the dark
// palette from reading as flat. Purely visual — sits behind content via -z-10.
export default function GlowField({ variant = 'default' }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-vantage-accent/25 blur-[110px]" />
      <div className="absolute -right-24 top-10 h-[24rem] w-[24rem] rounded-full bg-vantage-accentEnd/30 blur-[110px]" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-vantage-positive/15 blur-[120px]" />
      {variant === 'wide' && (
        <div className="absolute right-1/4 top-1/2 h-[20rem] w-[20rem] rounded-full bg-vantage-alert/15 blur-[120px]" />
      )}
    </div>
  )
}
