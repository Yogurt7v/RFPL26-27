import { useEffect, useReducer, useState } from 'react'
import { getPerfSummary, clearPerfEntries, subscribePerf } from '../api/perf'

const SLOW_MS = 300

function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour12: false })
}

export function PerfPanel() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [open, setOpen] = useState(false)

  useEffect(() => subscribePerf(() => force()), [])

  const summary = getPerfSummary()
  const slowCount = summary.byLabel.filter(s => s.maxMs >= SLOW_MS || s.errors > 0).length

  return (
    <div className={`perf-panel${open ? ' perf-panel--open' : ''}`}>
      <button
        className="perf-panel__toggle"
        onClick={() => setOpen(!open)}
        title="Метрики запросов к БД (dev)"
      >
        <span className="perf-panel__title">БД</span>
        <span className={`perf-panel__badge${slowCount > 0 ? ' perf-panel__badge--warn' : ''}`}>
          {summary.count}
        </span>
        <span className="perf-panel__chevron">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <div className="perf-panel__body">
          <div className="perf-panel__summary">
            <span>
              {summary.count} запросов · средний <strong>{summary.avgMs.toFixed(0)} ms</strong>
            </span>
            <span>
              макс <strong>{summary.maxMs.toFixed(0)} ms</strong> · ошибок{' '}
              <strong className={summary.errors > 0 ? 'perf-panel__errors' : ''}>{summary.errors}</strong>
            </span>
            <button
              className="perf-panel__clear"
              onClick={clearPerfEntries}
              title="Очистить историю"
            >
              ×
            </button>
          </div>

          {summary.byLabel.length === 0 ? (
            <p className="perf-panel__empty">Запросов ещё не было</p>
          ) : (
            <div className="perf-panel__table">
              <div className="perf-panel__row perf-panel__row--head">
                <span className="perf-panel__cell perf-panel__cell--label">Запрос</span>
                <span className="perf-panel__cell">Кол-во</span>
                <span className="perf-panel__cell">Avg</span>
                <span className="perf-panel__cell">Max</span>
                <span className="perf-panel__cell">Err</span>
                <span className="perf-panel__cell perf-panel__cell--time">Последний</span>
              </div>
              {summary.byLabel.map(stat => {
                const slow = stat.maxMs >= SLOW_MS || stat.errors > 0
                return (
                  <div
                    key={stat.label}
                    className={`perf-panel__row${slow ? ' perf-panel__row--slow' : ''}`}
                    title={slow ? `Первый медленный/ошибочный запрос: ${formatMs(stat.maxMs)}` : undefined}
                  >
                    <span className="perf-panel__cell perf-panel__cell--label">{stat.label}</span>
                    <span className="perf-panel__cell">{stat.count}</span>
                    <span className="perf-panel__cell">{formatMs(stat.avgMs)}</span>
                    <span className="perf-panel__cell">{formatMs(stat.maxMs)}</span>
                    <span className="perf-panel__cell">{stat.errors || '—'}</span>
                    <span className="perf-panel__cell perf-panel__cell--time">{formatTime(stat.lastTs)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}