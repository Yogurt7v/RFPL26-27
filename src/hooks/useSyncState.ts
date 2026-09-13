import { useQuery } from '@tanstack/react-query'
import { getSyncState } from '../api/sync'

export const SYNC_STATE_QUERY_KEY = ['sync', 'state'] as const

export const SYNC_POLL_MS = 120_000

// Единый источник состояния серверной синхронизации (get_sync_state).
// Используется и кнопкой «Обновить», и автосинком, поэтому база опрашивается
// один раз в минуту на открытую вкладку (один общий React Query-запрос).
export function useSyncStateQuery() {
  return useQuery({
    queryKey: SYNC_STATE_QUERY_KEY,
    queryFn: getSyncState,
    refetchInterval: SYNC_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: SYNC_POLL_MS - 5_000,
    retry: 1,
  })
}