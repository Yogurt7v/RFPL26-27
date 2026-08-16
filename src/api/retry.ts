function isTransientError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message || ''
    return /fetch|network|load/i.test(msg)
  }

  const e = err as { name?: string; status?: number; code?: string; message?: string } | null
  if (!e) return false

  if (e.name === 'TimeoutError' || e.name === 'AbortError') return true

  if (typeof e.status === 'number' && e.status >= 500) return true

  const code = e.code || ''
  if (code.startsWith('PGRST')) return false
  if (code === '23505' || code === '23503' || code === '23514') return false

  const msg = e.message || ''
  if (/timeout|timed out|network|ECONNRESET|ENOTFOUND|fetch failed|aborted/i.test(msg)) return true

  return false
}

export async function withRetry<T>(
  fn: () => PromiseLike<T>,
  attempts = 2,
  delayMs = 300
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < attempts - 1 && isTransientError(err)) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)))
      }
    }
  }

  throw lastError
}
