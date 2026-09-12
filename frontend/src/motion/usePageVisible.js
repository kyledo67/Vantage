import { useEffect } from 'react'

/**
 * Pauses ambient animation (skeleton shimmer, live dot) while the tab is
 * backgrounded. Sets `data-hidden` on <html>; the CSS in index.css halts the
 * looping animations when it's present, so nothing burns frames off-screen.
 */
export function usePageVisiblePause() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.toggleAttribute('data-hidden', document.hidden)
    }
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [])
}
