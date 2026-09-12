import { useCallback, useEffect, useState } from 'react'
import { getOpportunityById } from '../services/opportunities.js'

export function useOpportunityDetail(id) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!id) return
    setStatus('loading')
    setError(null)
    try {
      const result = await getOpportunityById(id)
      setData(result)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { data, status, error, refetch: load }
}
