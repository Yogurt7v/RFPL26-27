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
  lockStartedAt?: number | null
}

// Совпадает со stale-окном claim_sync в 018_sync_state.sql.
const LOCK_STALE_MS = 10 * 60_000
// «Обновлено» без времени — только пока данные свежие.
const RECENT_MS = 5 * 60_000

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

  const isFetchingData = statuses.some(s => s.isFetching && s.hasData)

  // Синк считается «идущим», только если замок свежий. Зависший замок
  // (in_progress=true, но lock_started_at старше stale-окна) — это не процесс.
  const lockFresh =
    syncState?.inProgress &&
    syncState.lockStartedAt !== null &&
    syncState.lockStartedAt !== undefined &&
    Date.now() - syncState.lockStartedAt < LOCK_STALE_MS

  const updating = isFetchingData || lockFresh
  const isStale = statuses.some(s => s.hasData && s.staleAt !== null)

  // Время последнего обновления: для кнопки с syncState берём время успешного
  // серверного синка («обновлено всё что положено»), для остальных — кэш страницы.
  const syncTimestamp = syncState?.lastSuccessAt ?? null
  const cacheTimestamp = statuses.reduce(
    (max, s) => Math.max(max, cacheGetUpdatedAt(s.cacheKey) ?? s.dataUpdatedAt),
    0
  )
  const lastUpdatedAt = Math.max(syncTimestamp ?? 0, cacheTimestamp)

  if (updating) {
    return (
      <span className="data-status-chip data-status-chip--updating" title="Обновление данных из БД">
        обновляется
      </span>
    )
  }

  if (lastUpdatedAt > 0) {
    const recent = Date.now() - lastUpdatedAt < RECENT_MS
    if (recent) {
      return (
        <span
          className={`data-status-chip data-status-chip--ok${isStale ? ' data-status-chip--has-stale' : ''}`}
          title={isStale
            ? 'Последний запрос не дошёл — показаны данные из кэша'
            : 'Данные синхронизированы'}
        >
          обновлено
          {isStale && <span className="data-status-chip__mark">кэш</span>}
        </span>
      )
    }
    return (
      <span
        className={`data-status-chip data-status-chip--ok${isStale ? ' data-status-chip--has-stale' : ''}`}
        title={isStale
          ? 'Последний запрос не дошёл — показаны данные из кэша'
          : 'Данные синхронизированы'}
      >
        обновлено {formatShortDateTime(lastUpdatedAt)}
        {isStale && <span className="data-status-chip__mark">кэш</span>}
      </span>
    )
  }

  if (fallback !== undefined) {
    return <span className="data-status-chip data-status-chip--idle">{fallback}</span>
  }

  return <span className="data-status-chip data-status-chip--idle">—</span>
}
