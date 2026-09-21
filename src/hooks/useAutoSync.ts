import { useEffect, useRef } from 'react'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { getSchedule, getCachedSchedule } from '../api/matches'
import { useSyncStateQuery } from './useSyncState'

const STALE_DEFAULT_MS = 60 * 60_000
const STALE_MATCHDAY_MS = 5 * 60_000
const RETRY_COOLDOWN_MS = 2 * 60_000

function moscowDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
}

// Автосинк «по требованию посетителей»: пока сайт открыт, данные в БД
// обновляются не реже порога (5 мин в дни матчей, 10 мин — иначе).
// Состояние берётся из общего запроса ['sync','state'] (useSyncStateQuery),
// серверный замок claim_sync сам решает, кто из конкурентов «победитель».
export function useAutoSync() {
  const queryClient = useQueryClient()
  const inFlight = useRef(false)
  const lastAttemptRef = useRef(0)
  const { data: syncState } = useSyncStateQuery()

  const { data: scheduleMatches = [] } = useQuery({
    queryKey: ['schedule'],
    queryFn: getSchedule,
    staleTime: 5 * 60 * 1000,
    initialData: getCachedSchedule,
    placeholderData: keepPreviousData,
  })

  const isMatchDay = scheduleMatches.some(m => m.date === moscowDateStr())
  const staleThresholdMs = isMatchDay ? STALE_MATCHDAY_MS : STALE_DEFAULT_MS

  useEffect(() => {
    if (syncState === undefined || syncState.inProgress) return

    const lastSuccess = syncState.lastSuccessAt ?? 0
    if (Date.now() - lastSuccess < staleThresholdMs) return
    if (Date.now() - lastAttemptRef.current < RETRY_COOLDOWN_MS) return
    if (inFlight.current) return
    inFlight.current = true
    lastAttemptRef.current = Date.now()

    let mounted = true

    const runSync = async (): Promise<void> => {
      try {
        const res = await fetch('/api/cron/sync-matches')
        const body = await res.json().catch(() => null)
        if (!mounted) return
        if (body?.status !== 'busy') {
          queryClient.invalidateQueries({ queryKey: ['matches'] })
          queryClient.invalidateQueries({ queryKey: ['standings'] })
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
          queryClient.invalidateQueries({ queryKey: ['predictions'] })
          queryClient.invalidateQueries({ queryKey: ['sync', 'state'] })
        }
      } catch {
        // сетевой сбой — дождёмся следующего тика
      } finally {
        inFlight.current = false
      }
    }

    runSync()

    return () => {
      mounted = false
    }
  }, [syncState, queryClient, staleThresholdMs])
}