import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { GraphData } from '../types'

export function useGraphData(apiUrl: string | undefined, currentUserId: string, authToken?: string, maxHops?: number) {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!apiUrl) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.fetchGraph(apiUrl, currentUserId, { maxHops }, authToken)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [apiUrl, currentUserId, authToken, maxHops])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, error, refresh, setData }
}
