import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Rotating editorial label anchored to the hero's lower-right, with dot pagination.
// Each entry is a capability the EV Finder actually has.
const slides = [
  { lead: 'With', headline: 'Positive EV' },
  { lead: 'From', headline: 'Sharp Books' },
  { lead: 'On', headline: 'Live Order Books' },
  { lead: 'Across', headline: 'Kalshi & Polymarket' },
]

export default function HeroRotator() {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000)
    return () => clearInterval(id)
  }, [reduceMotion])

  const slide = slides[index]

  return (
    <div className="flex shrink-0 flex-col items-end gap-5">
      <div className="relative h-[4.5rem] w-max text-right sm:h-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-end justify-center whitespace-nowrap"
          >
            <span className="font-display text-lg leading-none text-vantage-textDim sm:text-xl">
              {slide.lead}
            </span>
            <span className="font-display text-3xl leading-[1.1] text-vantage-text sm:text-4xl">
              {slide.headline}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2.5" role="tablist" aria-label="Hero highlights">
        {slides.map((s, i) => (
          <button
            key={s.headline}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${s.lead} ${s.headline}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${
              i === index
                ? 'w-7 bg-vantage-text'
                : 'w-1.5 bg-vantage-borderLight hover:bg-vantage-textDim'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
