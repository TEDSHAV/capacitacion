'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UseOptimizedFetchOptions, UseOptimizedFetchReturn } from '@/types'

export function useOptimizedFetch<T>(
  fetcher: () => Promise<T>,
  options: UseOptimizedFetchOptions<T> = {}
): UseOptimizedFetchReturn<T> {
  const {
    initialData,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    retryCount = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)
  const retryCountRef = useRef(0)

  const executeFetch = useCallback(async (isRetry = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      if (cacheRef.current && !isRetry) {
        const { data: cachedData, timestamp } = cacheRef.current
        if (Date.now() - timestamp < cacheTime) {
          setData(cachedData)
          setLoading(false)
          return
        }
      }

      const result = await fetcher()
      
      // Update cache
      cacheRef.current = {
        data: result,
        timestamp: Date.now()
      }

      setData(result)
      retryCountRef.current = 0 // Reset retry count on success
    } catch (err) {
      const error = err as Error
      
      // Retry logic
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++
        setTimeout(() => executeFetch(true), retryDelay * retryCountRef.current)
        return
      }
      
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, cacheTime, retryCount, retryDelay])

  const refetch = useCallback(() => {
    retryCountRef.current = 0
    return executeFetch(true)
  }, [executeFetch])

  useEffect(() => {
    executeFetch()
  }, [executeFetch])

  return { data, loading, error, refetch }
}
