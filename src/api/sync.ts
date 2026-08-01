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
