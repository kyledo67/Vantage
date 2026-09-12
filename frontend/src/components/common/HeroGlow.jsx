// Purple ambient glow for the hero. Composition mirrors the landing skeleton:
// a strong radial bloom centred behind the laptop on the right, plus a softer
// wash behind the copy on the left. Big and heavily blurred so it reads as
// atmosphere fading into the page, never as a box around the content.
export default function HeroGlow() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-screen -translate-x-1/2 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(45% 55% at 72% 45%, rgba(206,99,233,0.22) 0%, rgba(121,75,212,0.10) 45%, transparent 72%), radial-gradient(50% 60% at 12% 30%, rgba(121,75,212,0.14) 0%, transparent 70%)',
        }}
      />
      <div className="absolute right-[8%] top-1/4 h-[38rem] w-[38rem] rounded-full bg-vantage-accent/15 blur-[170px]" />
      <div className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-vantage-accentEnd/15 blur-[160px]" />
    </div>
  )
}
