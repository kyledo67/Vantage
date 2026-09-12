import { useCallback, useEffect, useState } from 'react'
import { getOpportunities } from '../services/opportunities.js'

export function useOpportunities(filters) {
  const [data, setData] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await getOpportunities(filters)
      setData(result)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    load()
  }, [load])

  return { data, status, error, refetch: load }
}
