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
