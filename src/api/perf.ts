const MAX_ENTRIES = 60
const SLOW_MS = 300

export interface PerfEntry {
  label: string
  ms: number
  ok: boolean
  ts: number
}

const entries: PerfEntry[] = []

export function getPerfEntries(): readonly PerfEntry[] {
  return entries
}

export function clearPerfEntries(): void {
  entries.length = 0
}

function record(entry: PerfEntry): void {
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()

  if (entry.ms >= SLOW_MS || !entry.ok) {
    console.warn(`[perf] ${entry.label}: ${Math.round(entry.ms)} ms${entry.ok ? '' : ' (error)'}`)
  }
}

function rawUrlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function labelFor(input: RequestInfo | URL, init?: RequestInit): string {
  const method = (init?.method ?? 'GET').toUpperCase()
  const path = rawUrlOf(input).split('?')[0]
  const restIdx = path.indexOf('/rest/v1/')
  if (restIdx !== -1) {
    const rest = path.slice(restIdx + '/rest/v1/'.length)
    if (rest.startsWith('rpc/')) return `rpc:${rest.slice(4)}`
    return `rest:${method}:${rest}`
  }
  return `fetch:${method}`
}

export function installPerfFetch(supabaseHost: string): void {
  const g = globalThis as typeof globalThis & { __rfplPerfInstalled?: boolean }
  if (g.__rfplPerfInstalled) return
  g.__rfplPerfInstalled = true

  const nativeFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = rawUrlOf(input)
    if (!rawUrl.includes(supabaseHost)) {
      return nativeFetch(input, init)
    }

    const label = labelFor(input, init)
    const start = performance.now()
    try {
      const res = await nativeFetch(input, init)
      record({ label, ms: performance.now() - start, ok: res.ok, ts: Date.now() })
      return res
    } catch (err) {
      record({ label, ms: performance.now() - start, ok: false, ts: Date.now() })
      throw err
    }
  }) as typeof fetch

  if (typeof window !== 'undefined') {
    ;(window as unknown as { __rfplPerf: { getPerfEntries: () => readonly PerfEntry[]; clearPerfEntries: () => void } }).__rfplPerf = {
      getPerfEntries,
      clearPerfEntries,
    }
  }
}
