import { useState } from 'react'
import { schedule } from '../lib/schedule'
import { calculatePoints, type Prediction, type Outcome } from '../lib/scoring'

interface TestResult {
  rule: string
  points: number
  details: string
}

export default function TestScoringPage() {
  const [matchIndex, setMatchIndex] = useState(0)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [predHome, setPredHome] = useState('')
  const [predAway, setPredAway] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [homeThreshold, setHomeThreshold] = useState<number | null>(null)
  const [awayThreshold, setAwayThreshold] = useState<number | null>(null)
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)

  const match = schedule[matchIndex]

  function calc() {
    const pred: Prediction = {
      predictedHomeScore: predHome !== '' ? Number(predHome) : null,
      predictedAwayScore: predAway !== '' ? Number(predAway) : null,
      outcome,
      homeGoalsThreshold: homeThreshold,
      awayGoalsThreshold: awayThreshold,
    }
    const result = { homeScore, awayScore }
    const pts = calculatePoints(pred, result)
    setTotalPoints(pts)

    const actualOutcome: Outcome =
      homeScore > awayScore ? '1' : homeScore === awayScore ? 'X' : '2'
    const actualLabel = actualOutcome === '1' ? 'П1' : actualOutcome === 'X' ? 'Ничья' : 'П2'

    const details: TestResult[] = []

    const hasScores = pred.predictedHomeScore != null && pred.predictedAwayScore != null
    if (hasScores) {
      const predOutcome: Outcome =
        pred.predictedHomeScore! > pred.predictedAwayScore! ? '1' :
        pred.predictedHomeScore! === pred.predictedAwayScore! ? 'X' : '2'
      const predLabel = predOutcome === '1' ? 'П1' : predOutcome === 'X' ? 'Ничья' : 'П2'

      if (pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore) {
        details.push({ rule: 'Точный счёт', points: 5, details: `${predHome}:${predAway} = ${homeScore}:${awayScore}` })
      } else {
        details.push({ rule: 'Точный счёт', points: 0, details: `${predHome}:${predAway} ≠ ${homeScore}:${awayScore}` })
      }

      if (predOutcome === actualOutcome) {
        details.push({ rule: 'Исход (из счёта)', points: 3, details: `${predLabel} = ${actualLabel}` })
      } else {
        details.push({ rule: 'Исход (из счёта)', points: 0, details: `${predLabel} ≠ ${actualLabel}` })
      }
    } else if (outcome != null) {
      if (outcome === actualOutcome) {
        details.push({ rule: 'Исход (выбор)', points: 3, details: `${outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2'} = ${actualLabel}` })
      } else {
        details.push({ rule: 'Исход (выбор)', points: 0, details: `${outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2'} ≠ ${actualLabel}` })
      }
    }

    if (homeThreshold != null) {
      if (homeScore >= homeThreshold) {
        details.push({ rule: `Голы хозяев ≥ ${homeThreshold}`, points: homeThreshold, details: `${homeScore} ≥ ${homeThreshold} ✓` })
      } else {
        details.push({ rule: `Голы хозяев ≥ ${homeThreshold}`, points: 0, details: `${homeScore} < ${homeThreshold} ✗` })
      }
    }

    if (awayThreshold != null) {
      if (awayScore >= awayThreshold) {
        details.push({ rule: `Голы гостей ≥ ${awayThreshold}`, points: awayThreshold, details: `${awayScore} ≥ ${awayThreshold} ✓` })
      } else {
        details.push({ rule: `Голы гостей ≥ ${awayThreshold}`, points: 0, details: `${awayScore} < ${awayThreshold} ✗` })
      }
    }

    setResults(details)
  }

  function setPreset(predH: number, predA: number) {
    setPredHome(String(predH))
    setPredAway(String(predA))
    setOutcome(null)
  }

  function setOutcomePreset(o: Outcome) {
    setOutcome(o)
    setPredHome('')
    setPredAway('')
  }

  return (
    <div className="page">
      <div className="test-scoring">
        <div className="test-scoring__header">
          <span className="test-scoring__title">Тестирование системы очков</span>
        </div>

        <section className="test-scoring__section">
          <label className="test-scoring__label">Матч</label>
          <select
            className="test-scoring__select"
            value={matchIndex}
            onChange={e => { setMatchIndex(Number(e.target.value)); setResults(null) }}
          >
            {schedule.map((m, i) => (
              <option key={m.id} value={i}>
                Т {m.round}: {m.homeTeam} — {m.awayTeam} ({m.date})
              </option>
            ))}
          </select>
        </section>

        <section className="test-scoring__section">
          <div className="test-scoring__section-title">Результат матча</div>
          <div className="test-scoring__row">
            <input
              className="test-scoring__input"
              type="number"
              min={0}
              max={20}
              placeholder="0"
              value={homeScore}
              onChange={e => setHomeScore(Number(e.target.value))}
            />
            <span className="test-scoring__dash">:</span>
            <input
              className="test-scoring__input"
              type="number"
              min={0}
              max={20}
              placeholder="0"
              value={awayScore}
              onChange={e => setAwayScore(Number(e.target.value))}
            />
          </div>
          <div className="test-scoring__teams">
            <span>{match.homeTeam}</span>
            <span>{match.awayTeam}</span>
          </div>
        </section>

        <section className="test-scoring__section">
          <div className="test-scoring__section-title">Прогноз пользователя</div>

          <div className="test-scoring__subsection">
            <label className="test-scoring__label">Счёт</label>
            <div className="test-scoring__row">
              <input
                className="test-scoring__input"
                type="number"
                min={0}
                max={20}
                placeholder="—"
                value={predHome}
                onChange={e => setPredHome(e.target.value)}
              />
              <span className="test-scoring__dash">:</span>
              <input
                className="test-scoring__input"
                type="number"
                min={0}
                max={20}
                placeholder="—"
                value={predAway}
                onChange={e => setPredAway(e.target.value)}
              />
            </div>
            <div className="test-scoring__presets">
              <button className="test-scoring__preset" onClick={() => setPreset(homeScore, awayScore)}>Точный счёт</button>
              <button className="test-scoring__preset" onClick={() => setPreset(homeScore + 1, awayScore)}>Сдвинуть +1</button>
              <button className="test-scoring__preset" onClick={() => setPreset(0, 0)}>Нули</button>
              <button className="test-scoring__preset" onClick={() => { setPredHome(''); setPredAway(''); }}>Очистить</button>
            </div>
          </div>

          <div className="test-scoring__subsection">
            <label className="test-scoring__label">Исход (если счёт не задан)</label>
            <div className="test-scoring__row">
              {(['1', 'X', '2'] as Outcome[]).map(o => (
                <button
                  key={o}
                  className={`test-scoring__btn ${outcome === o ? 'test-scoring__btn--active' : ''}`}
                  onClick={() => setOutcomePreset(o)}
                >
                  {o === '1' ? 'П1' : o === 'X' ? 'X' : 'П2'}
                </button>
              ))}
              <button className="test-scoring__preset" onClick={() => setOutcome(null)}>Очистить</button>
            </div>
          </div>

          <div className="test-scoring__subsection">
            <label className="test-scoring__label">Голы хозяев ≥</label>
            <select
              className="test-scoring__select test-scoring__select--sm"
              value={homeThreshold ?? ''}
              onChange={e => setHomeThreshold(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">—</option>
              {[2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="test-scoring__subsection">
            <label className="test-scoring__label">Голы гостей ≥</label>
            <select
              className="test-scoring__select test-scoring__select--sm"
              value={awayThreshold ?? ''}
              onChange={e => setAwayThreshold(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">—</option>
              {[2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </section>

        <button className="test-scoring__calc" onClick={calc}>
          Рассчитать
        </button>

        {results && (
          <section className="test-scoring__section test-scoring__results">
            <div className="test-scoring__section-title">Результат расчёта</div>
            {results.map((r, i) => (
              <div key={i} className="test-scoring__result-row">
                <span className="test-scoring__result-rule">{r.rule}</span>
                <span className="test-scoring__result-details">{r.details}</span>
                <span className={`test-scoring__result-pts ${r.points > 0 ? 'test-scoring__result-pts--ok' : 'test-scoring__result-pts--miss'}`}>
                  {r.points > 0 ? `+${r.points}` : '0'}
                </span>
              </div>
            ))}
            <div className="test-scoring__total">
              ИТОГО: {totalPoints} {totalPoints === 1 ? 'очко' : totalPoints >= 2 && totalPoints <= 4 ? 'очка' : 'очков'}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
