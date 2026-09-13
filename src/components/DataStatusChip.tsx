import { useReducer, useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { getStaleMarker, subscribeStale } from '../api/cache'

export interface DataSource {
  queryKey: QueryKey
  cacheKey: string
}

export interface SyncStateInfo {
  inProgress: boolean
  lastSuccessAt: number | null
}

const RECENT_SUCCESS_MS = 60 * 60_000

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour12: false })
}

interface DataStatusChipProps {
  sources: DataSource[]
  syncState?: SyncStateInfo
  fallback?: string
}

export function DataStatusChip({ sources, syncState, fallback }: DataStatusChipProps) {
  const queryClient = useQueryClient()
  const [, force] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const unsubCache = queryClient.getQueryCache().subscribe(() => force())
    const unsubStale = subscribeStale(() => force())
    return () => {
      unsubCache()
      unsubStale()
    }
  }, [queryClient])

  const statuses = sources.map(source => {
    const state = queryClient.getQueryState(source.queryKey)
    return {
      cacheKey: source.cacheKey,
      hasData: state?.data !== undefined,
      isFetching: state?.fetchStatus === 'fetching',
      staleAt: getStaleMarker(source.cacheKey),
    }
  })

  const updating = statuses.some(s => s.isFetching && s.hasData)
  const stale = statuses.filter(s => s.hasData && s.staleAt !== null)
  const lastStaleAt = stale.reduce((max, s) => Math.max(max, s.staleAt ?? 0), 0)

  const serverUpdating = !!syncState?.inProgress
  const lastSuccess = syncState?.lastSuccessAt ?? 0
  const recentlySynced = syncState !== undefined && lastSuccess > 0 && Date.now() - lastSuccess <= RECENT_SUCCESS_MS

  let label: string
  let mode: 'updating' | 'stale' | 'ok'

  if (updating || serverUpdating) {
    label = '⟳ обновляется'
    mode = 'updating'
  } else if (stale.length > 0) {
    label = `кэш от ${formatTime(lastStaleAt)}`
    mode = 'stale'
  } else if (recentlySynced) {
    label = `обновлено ${formatTime(lastSuccess)}`
    mode = 'ok'
  } else if (fallback !== undefined) {
    return <span className="data-status-chip data-status-chip--idle">{fallback}</span>
  } else {
    return null
  }

  return (
    <span
      className={`data-status-chip data-status-chip--${mode}`}
      title={mode === 'updating'
        ? 'Обновление данных из БД'
        : mode === 'stale'
          ? 'Последний запрос не дошёл — показаны данные из кэша'
          : 'Данные синхронизированы'}
    >
      {label}
    </span>
  )
}