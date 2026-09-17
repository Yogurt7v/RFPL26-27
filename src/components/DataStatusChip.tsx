import { useCallback, useSyncExternalStore } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { getStaleMarker, subscribeStale, cacheGetUpdatedAt } from '../api/cache'
import { formatTime } from '../lib/format'

let version = 0
function bumpVersion() {
  version += 1
}

export interface DataSource {
  queryKey: QueryKey
  cacheKey: string
}

export interface SyncStateInfo {
  inProgress: boolean
  lastSuccessAt: number | null
}

function formatShortDateTime(ts: number): string {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month} ${formatTime(d)}`
}

interface DataStatusChipProps {
  sources: DataSource[]
  syncState?: SyncStateInfo
  fallback?: string
}

export function DataStatusChip({ sources, syncState, fallback }: DataStatusChipProps) {
  const queryClient = useQueryClient()

  useSyncExternalStore(
    useCallback(
      () => {
        const unsubCache = queryClient.getQueryCache().subscribe(bumpVersion)
        const unsubStale = subscribeStale(bumpVersion)
        return () => {
          unsubCache()
          unsubStale()
        }
      },
      [queryClient],
    ),
    () => version,
  )

  const statuses = sources.map(source => {
    const state = queryClient.getQueryState(source.queryKey)
    return {
      cacheKey: source.cacheKey,
      hasData: state?.data !== undefined,
      isFetching: state?.fetchStatus === 'fetching',
      dataUpdatedAt: state?.dataUpdatedAt ?? 0,
      staleAt: getStaleMarker(source.cacheKey),
    }
  })

  const updating = statuses.some(s => s.isFetching && s.hasData) || !!syncState?.inProgress
  const isStale = statuses.some(s => s.hasData && s.staleAt !== null)

  const lastUpdatedAt = statuses.reduce(
    (max, s) => Math.max(max, cacheGetUpdatedAt(s.cacheKey) ?? s.dataUpdatedAt),
    0
  )

  if (updating) {
    return (
      <span className="data-status-chip data-status-chip--updating" title="Обновление данных из БД">
        обновляется
      </span>
    )
  }

  if (lastUpdatedAt > 0) {
    const label = `обновлено ${formatShortDateTime(lastUpdatedAt)}`
    return (
      <span
        className={`data-status-chip data-status-chip--ok${isStale ? ' data-status-chip--has-stale' : ''}`}
        title={isStale
          ? 'Последний запрос не дошёл — показаны данные из кэша'
          : 'Данные синхронизированы'}
      >
        {label}
        {isStale && <span className="data-status-chip__mark">кэш</span>}
      </span>
    )
  }

  if (fallback !== undefined) {
    return <span className="data-status-chip data-status-chip--idle">{fallback}</span>
  }

  return <span className="data-status-chip data-status-chip--idle">—</span>
}
