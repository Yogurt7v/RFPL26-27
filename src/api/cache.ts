const PREFIX = 'rfpl_cache:'
const DEFAULT_TTL = 15 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

export function cacheSet(key: string, value: unknown, ttlMs: number = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<unknown> = {
      value,
      expiresAt: Date.now() + ttlMs,
    }
    const next = JSON.stringify(entry)
    const prev = localStorage.getItem(PREFIX + key)
    if (prev === next) return
    localStorage.setItem(PREFIX + key, next)
  } catch {
    // ignore quota/security errors
  }
}

export function cacheGetStale<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    return entry.value
  } catch {
    return null
  }
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore quota/security errors
  }
}

// ── Реестр «отдал просроченный кэш» ───────────────────────────────────
// Отмечает источники данных, которые вернули кэш вместо свежего ответа
// (network error / timeout). Используется UI-индикатором (DataStatusChip),
// чтобы устаревшие данные не показывались «молча».

interface StaleMarker {
  at: number
}

const staleMarkers = new Map<string, StaleMarker>()
const staleListeners = new Set<() => void>()

export function markDataStale(key: string): void {
  staleMarkers.set(key, { at: Date.now() })
  for (const listener of staleListeners) listener()
}

export function clearDataStale(key: string): void {
  if (staleMarkers.delete(key)) {
    for (const listener of staleListeners) listener()
  }
}

export function getStaleMarker(key: string): number | null {
  return staleMarkers.get(key)?.at ?? null
}

export function subscribeStale(listener: () => void): () => void {
  staleListeners.add(listener)
  return () => {
    staleListeners.delete(listener)
  }
}
