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
  emit()
}

function record(entry: PerfEntry): void {
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  emit()

  if (entry.ms >= SLOW_MS || !entry.ok) {
    console.warn(`[perf] ${entry.label}: ${Math.round(entry.ms)} ms${entry.ok ? '' : ' (error)'}`)
  }
}

// ── Подписка (для UI-панели) ──────────────────────────────────────────

type PerfListener = () => void

const listeners = new Set<PerfListener>()

export function subscribePerf(listener: PerfListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

// ── Сводная статистика по каждому запросу ─────────────────────────────

export interface PerfLabelStat {
  label: string
  count: number
  avgMs: number
  maxMs: number
  errors: number
  lastMs: number
  lastTs: number
  samples: PerfEntry[]
}

export interface PerfSummary {
  count: number
  maxMs: number
  avgMs: number
  errors: number
  byLabel: PerfLabelStat[]
}

export function getPerfSummary(): PerfSummary {
  const map = new Map<string, PerfLabelStat>()

  for (const entry of entries) {
    let stat = map.get(entry.label)
    if (!stat) {
      stat = { label: entry.label, count: 0, avgMs: 0, maxMs: 0, errors: 0, lastMs: 0, lastTs: 0, samples: [] }
      map.set(entry.label, stat)
    }
    stat.count += 1
    stat.avgMs = stat.avgMs + (entry.ms - stat.avgMs) / stat.count
    stat.maxMs = Math.max(stat.maxMs, entry.ms)
    if (!entry.ok) stat.errors += 1
    stat.lastMs = entry.ms
    stat.lastTs = entry.ts
    if (stat.samples.length < MAX_ENTRIES) stat.samples.push(entry)
  }

  const byLabel = Array.from(map.values()).sort((a, b) => b.lastTs - a.lastTs)

  const totalCount = entries.length
  const totalMs = entries.reduce((sum, e) => sum + e.ms, 0)

  return {
    count: totalCount,
    maxMs: entries.reduce((m, e) => Math.max(m, e.ms), 0),
    avgMs: totalCount > 0 ? totalMs / totalCount : 0,
    errors: entries.filter(e => !e.ok).length,
    byLabel,
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
    ;(window as unknown as { __rfplPerf: { getPerfEntries: () => readonly PerfEntry[]; clearPerfEntries: () => void; getPerfSummary: () => PerfSummary; subscribePerf: (l: PerfListener) => () => void } }).__rfplPerf = {
      getPerfEntries,
      clearPerfEntries,
      getPerfSummary,
      subscribePerf,
    }
  }
}