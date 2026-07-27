export async function withRetry<T>(
  fn: () => PromiseLike<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)))
      }
    }
  }

  throw lastError
}
