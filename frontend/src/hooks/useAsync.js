import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Minimal async state machine: idle → loading → success | error.
 * Ignores responses from superseded requests so fast filter changes can't
 * land stale data on screen.
 */
export function useAsync(asyncFn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })
  const requestId = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const id = ++requestId.current
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const data = await asyncFn()
      if (id === requestId.current) setState({ status: 'success', data, error: null })
      return data
    } catch (error) {
      if (id === requestId.current) setState({ status: 'error', data: null, error })
      return undefined
    }
  }, deps)

  useEffect(() => {
    if (immediate) run()
  }, [run, immediate])

  return { ...state, refetch: run }
}
