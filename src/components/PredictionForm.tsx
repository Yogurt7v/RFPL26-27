import { useState } from 'react'
import { getTeamByName } from '../lib/teams'
import { validatePrediction, type Outcome, type GoalsTeam } from '../lib/scoring'

interface PredictionFormProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  onSubmit: (prediction: PredictionData) => Promise<void>
}

export interface PredictionData {
  matchId: string
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: Outcome | null
  goalsTeam: GoalsTeam | null
  goalsThreshold: number | null
}

type Step = 'outcome' | 'score' | 'goals' | 'done'

const SCORE_OPTIONS = [0, 1, 2, 3, 4]
const SCORE_OPTIONS_EXTRA = [5, 6, 7, 8, 9, 10]

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  onSubmit,
}: PredictionFormProps) {
  const [step, setStep] = useState<Step>('outcome')
  const [homeScore, setHomeScore] = useState<number | ''>('')
  const [awayScore, setAwayScore] = useState<number | ''>('')
  const [outcome, setOutcome] = useState<Outcome | ''>('')
  const [goalsTeam, setGoalsTeam] = useState<GoalsTeam | ''>('')
  const [goalsThreshold, setGoalsThreshold] = useState<number | ''>('')
  const [showExtraScore, setShowExtraScore] = useState(false)
  const [showExtraGoals, setShowExtraGoals] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  const buildPrediction = (): PredictionData => ({
    matchId,
    predictedHomeScore: homeScore !== '' ? homeScore : null,
    predictedAwayScore: awayScore !== '' ? awayScore : null,
    outcome: (outcome as Outcome) || null,
    goalsTeam: (goalsTeam as GoalsTeam) || null,
    goalsThreshold: goalsThreshold !== '' ? goalsThreshold : null,
  })

  const handleSubmit = async () => {
    const prediction = buildPrediction()
    const errors = validatePrediction(prediction)
    if (errors.length > 0) {
      alert(errors[0])
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(prediction)
      setIsSaved(true)
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (step === 'outcome') setStep('score')
    else if (step === 'score') setStep('goals')
    else if (step === 'goals') setStep('done')
  }

  const handleBack = () => {
    if (step === 'score') setStep('outcome')
    else if (step === 'goals') setStep('score')
  }

  const currentScoreOptions = showExtraScore ? [...SCORE_OPTIONS, ...SCORE_OPTIONS_EXTRA] : SCORE_OPTIONS
  const currentGoalsOptions = showExtraGoals ? [...SCORE_OPTIONS, ...SCORE_OPTIONS_EXTRA] : SCORE_OPTIONS

  if (isSaved) {
    return (
      <div className="check check--saved">
        <div className="check__tear" />
        <div className="check__content">
          <div className="check__header">
            <span className="check__title">✅ Прогноз сохранён</span>
          </div>
          <div className="check__match">
            {homeTeam} — {awayTeam}
          </div>
          <div className="check__details">
            {outcome && (
              <div className="check__line">
                Исход: {outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2'}
              </div>
            )}
            {homeScore !== '' && awayScore !== '' && (
              <div className="check__line">Счёт: {homeScore}:{awayScore}</div>
            )}
            {goalsTeam && goalsThreshold !== '' && (
              <div className="check__line">
                Порог: {goalsTeam === 'home' ? homeTeam : awayTeam} ≥ {goalsThreshold}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="check">
      <div className="check__header">
        <span className="check__title">ЧЕК ПРОГНОЗА</span>
      </div>

      <div className="check__match">
        <div className="check__teams">
          <div className="check__team">
            {home && <img src={home.logo} alt="" className="check__logo" />}
            <span>{homeTeam}</span>
          </div>
          <span className="check__vs">vs</span>
          <div className="check__team">
            <span>{awayTeam}</span>
            {away && <img src={away.logo} alt="" className="check__logo" />}
          </div>
        </div>
      </div>

      <div className="check__steps">
        {/* Шаг 1: Исход */}
        <div className={`check__step ${step === 'outcome' ? 'check__step--active' : ''} ${step !== 'outcome' && outcome ? 'check__step--done' : ''}`}>
          <div className="check__step-header">
            <span className="check__step-number">1</span>
            <span className="check__step-title">Исход</span>
            {outcome && step !== 'outcome' && (
              <span className="check__step-value">
                {outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2'}
              </span>
            )}
          </div>
          {step === 'outcome' && (
            <div className="check__step-content">
              <div className="check__outcome-buttons">
                <button
                  type="button"
                  className={`check__outcome-btn ${outcome === '1' ? 'check__outcome-btn--active' : ''}`}
                  onClick={() => setOutcome('1')}
                >
                  П1
                </button>
                <button
                  type="button"
                  className={`check__outcome-btn ${outcome === 'X' ? 'check__outcome-btn--active' : ''}`}
                  onClick={() => setOutcome('X')}
                >
                  Ничья
                </button>
                <button
                  type="button"
                  className={`check__outcome-btn ${outcome === '2' ? 'check__outcome-btn--active' : ''}`}
                  onClick={() => setOutcome('2')}
                >
                  П2
                </button>
              </div>
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--skip" onClick={handleSkip}>
                  Пропустить
                </button>
                <button
                  type="button"
                  className="check__btn check__btn--next"
                  onClick={() => setStep('score')}
                  disabled={!outcome}
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="check__divider" />

        {/* Шаг 2: Точный счёт */}
        <div className={`check__step ${step === 'score' ? 'check__step--active' : ''} ${step !== 'score' && homeScore !== '' && awayScore !== '' ? 'check__step--done' : ''}`}>
          <div className="check__step-header">
            <span className="check__step-number">2</span>
            <span className="check__step-title">Точный счёт</span>
            {homeScore !== '' && awayScore !== '' && step !== 'score' && (
              <span className="check__step-value">{homeScore}:{awayScore}</span>
            )}
          </div>
          {step === 'score' && (
            <div className="check__step-content">
              <div className="check__score-selects">
                <select
                  value={homeScore}
                  onChange={e => setHomeScore(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="check__score-select"
                >
                  <option value="">—</option>
                  {currentScoreOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="check__score-sep">:</span>
                <select
                  value={awayScore}
                  onChange={e => setAwayScore(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="check__score-select"
                >
                  <option value="">—</option>
                  {currentScoreOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              {!showExtraScore && (
                <button type="button" className="check__show-more" onClick={() => setShowExtraScore(true)}>
                  Больше (5-10) ▼
                </button>
              )}
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--back" onClick={handleBack}>
                  Назад
                </button>
                <button type="button" className="check__btn check__btn--skip" onClick={handleSkip}>
                  Пропустить
                </button>
                <button
                  type="button"
                  className="check__btn check__btn--next"
                  onClick={() => setStep('goals')}
                  disabled={homeScore === '' || awayScore === ''}
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="check__divider" />

        {/* Шаг 3: Порог голов */}
        <div className={`check__step ${step === 'goals' ? 'check__step--active' : ''} ${step !== 'goals' && goalsTeam && goalsThreshold !== '' ? 'check__step--done' : ''}`}>
          <div className="check__step-header">
            <span className="check__step-number">3</span>
            <span className="check__step-title">Порог голов</span>
            {goalsTeam && goalsThreshold !== '' && step !== 'goals' && (
              <span className="check__step-value">
                {goalsTeam === 'home' ? homeTeam : awayTeam} ≥ {goalsThreshold}
              </span>
            )}
          </div>
          {step === 'goals' && (
            <div className="check__step-content">
              <div className="check__goals-selects">
                <select
                  value={goalsTeam}
                  onChange={e => setGoalsTeam(e.target.value as GoalsTeam | '')}
                  className="check__goals-select"
                >
                  <option value="">Команда</option>
                  <option value="home">{homeTeam}</option>
                  <option value="away">{awayTeam}</option>
                </select>
                <span className="check__goals-text">забьёт ≥</span>
                <select
                  value={goalsThreshold}
                  onChange={e => setGoalsThreshold(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="check__score-select"
                >
                  <option value="">—</option>
                  {currentGoalsOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="check__goals-text">голов</span>
              </div>
              {!showExtraGoals && (
                <button type="button" className="check__show-more" onClick={() => setShowExtraGoals(true)}>
                  Больше (5-10) ▼
                </button>
              )}
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--back" onClick={handleBack}>
                  Назад
                </button>
                <button type="button" className="check__btn check__btn--skip" onClick={() => setStep('done')}>
                  Пропустить
                </button>
                <button
                  type="button"
                  className="check__btn check__btn--next"
                  onClick={() => setStep('done')}
                  disabled={!goalsTeam || goalsThreshold === ''}
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Итого и кнопка сохранения */}
      <div className="check__footer">
        <div className="check__total">
          <span>Итого:</span>
          <span className="check__total-value">
            {(() => {
              const p = buildPrediction()
              const errors = validatePrediction(p)
              if (errors.length > 0) return '—'
              let pts = 0
              if (p.predictedHomeScore != null && p.predictedAwayScore != null) pts += 5
              if (p.outcome) pts += 3
              if (p.goalsTeam && p.goalsThreshold) pts += p.goalsThreshold
              return pts
            })()} очков
          </span>
        </div>
        <div className="check__tear-line" />
        <button
          type="button"
          className="check__submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохранение...' : 'Сделать прогноз'}
        </button>
      </div>
    </div>
  )
}
