import { supabase } from './supabase'

export interface SyncState {
  inProgress: boolean
  lastSuccessAt: number | null
}

export async function triggerSync(): Promise<void> {
  const res = await fetch('/api/cron/sync-matches')
  if (!res.ok) {
    throw new Error(`Sync failed with status ${res.status}`)
  }

  const body = await res.json().catch(() => null)

  if (body?.status === 'error' || body?.status === 'partial' && (body?.errors?.length ?? 0) > 0) {
    throw new Error(body?.errors?.[0] || 'Ошибка синхронизации')
  }
}

export async function getSyncState(): Promise<SyncState> {
  const { data, error } = await supabase.rpc('get_sync_state')
  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? 'Empty sync state')
  }
  const row = data[0] as { in_progress: boolean; last_success_at: string | null }
  return {
    inProgress: Boolean(row.in_progress),
    lastSuccessAt: row.last_success_at ? new Date(row.last_success_at).getTime() : null,
  }
}
