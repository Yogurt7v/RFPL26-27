import { useState } from 'react'
import { getTeamByName } from '../lib/teams'
import { validatePrediction, type Outcome, type GoalsTeam } from '../lib/scoring'

export interface PredictionFormData {
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: Outcome | null
  goalsTeam: GoalsTeam | null
  goalsThreshold: number | null
}

interface PredictionFormProps {
  homeTeam: string
  awayTeam: string
  isFinished?: boolean
  actualHomeScore?: number | null
  actualAwayScore?: number | null
  points?: number | null
  initialValues?: PredictionFormData | null
  onSubmit: (prediction: PredictionFormData) => Promise<boolean>
  onSaved?: () => void
  canEdit?: boolean
}

type ActiveStep = 'outcome' | 'score' | 'goals' | null

const SCORE_OPTIONS = [0, 1, 2, 3, 4]
const SCORE_OPTIONS_EXTRA = [5, 6, 7, 8, 9, 10]

export function PredictionForm({
  homeTeam,
  awayTeam,
  isFinished = false,
  actualHomeScore,
  actualAwayScore,
  points,
  initialValues,
  onSubmit,
  onSaved,
  canEdit = false,
}: PredictionFormProps) {
  const [activeStep, setActiveStep] = useState<ActiveStep>('outcome')
  const [homeScore, setHomeScore] = useState<number | ''>(initialValues?.predictedHomeScore ?? '')
  const [awayScore, setAwayScore] = useState<number | ''>(initialValues?.predictedAwayScore ?? '')
  const [outcome, setOutcome] = useState<Outcome | ''>((initialValues?.outcome as Outcome) || '')
  const [goalsTeam, setGoalsTeam] = useState<GoalsTeam | ''>((initialValues?.goalsTeam as GoalsTeam) || '')
  const [goalsThreshold, setGoalsThreshold] = useState<number | ''>(initialValues?.goalsThreshold ?? '')
  const [showExtraScore, setShowExtraScore] = useState(false)
  const [showExtraGoals, setShowExtraGoals] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(!!initialValues)
  const [saveError, setSaveError] = useState<string | null>(null)

  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  const buildPrediction = (): PredictionFormData => ({
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
    setSaveError(null)
    try {
      const ok = await onSubmit(prediction)
      if (ok) {
        setIsSaved(true)
      } else {
        setSaveError('Не удалось сохранить прогноз')
      }
    } catch {
      setSaveError('Ошибка сохранения')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (activeStep === 'outcome') { setActiveStep('score'); return }
    if (activeStep === 'score') { setActiveStep('goals'); return }
    if (activeStep === 'goals') { setActiveStep(null); return }
  }

  const handleNext = () => {
    if (activeStep === 'outcome') { setActiveStep('score'); return }
    if (activeStep === 'score') { setActiveStep('goals'); return }
    if (activeStep === 'goals') { setActiveStep(null); return }
  }

  const handleBack = () => {
    if (activeStep === 'score') { setActiveStep('outcome'); return }
    if (activeStep === 'goals') { setActiveStep('score'); return }
  }

  const currentScoreOptions = showExtraScore ? [...SCORE_OPTIONS, ...SCORE_OPTIONS_EXTRA] : SCORE_OPTIONS
  const currentGoalsOptions = showExtraGoals ? [...SCORE_OPTIONS, ...SCORE_OPTIONS_EXTRA] : SCORE_OPTIONS

  const hasOutcome = !!outcome
  const hasScore = homeScore !== '' && awayScore !== ''
  const hasGoals = !!goalsTeam && goalsThreshold !== ''

  /* ─── Saved state ──────────────────────── */
  if (isSaved) {
    return (
      <div className="check check--saved">
        <div className="check__header check__header--success">
          <span className="check__title">Прогноз принят</span>
        </div>

        <div className="check__saved-match">
          {homeTeam}
          {actualHomeScore != null && actualAwayScore != null && (
            <span className="check__score">{actualHomeScore}:{actualAwayScore}</span>
          )}
          {awayTeam}
        </div>

        <div className="check__divider" />

        <div className="check__prediction-summary">
          <div className="check__summary-row">
            <span className="check__summary-label">Исход</span>
            <span className={`check__summary-value ${isFinished ? (outcome === '1' && actualHomeScore != null && actualHomeScore > (actualAwayScore ?? 0) || outcome === 'X' && actualHomeScore === actualAwayScore || outcome === '2' && actualAwayScore != null && actualAwayScore > (actualHomeScore ?? 0) ? 'check__summary-correct' : 'check__summary-wrong') : ''}`}>
              {outcome ? (outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2') : '—'}
            </span>
          </div>
          <div className="check__summary-row">
            <span className="check__summary-label">Точный счёт</span>
            <span className={`check__summary-value ${isFinished && hasScore && actualHomeScore === homeScore && actualAwayScore === awayScore ? 'check__summary-correct' : ''}`}>
              {hasScore ? `${homeScore}:${awayScore}` : '—'}
            </span>
          </div>
          <div className="check__summary-row">
            <span className="check__summary-label">Порог голов</span>
            <span className="check__summary-value">
              {hasGoals ? `${goalsTeam === 'home' ? homeTeam : awayTeam} ≥ ${goalsThreshold}` : '—'}
            </span>
          </div>
        </div>

        {isFinished && points != null && points > 0 && (
          <>
            <div className="check__divider" />
            <div className="check__winnings">
              <div className="check__winnings-label">Выигрыш</div>
              <div className="check__winnings-value">+{points} очков</div>
            </div>
          </>
        )}

        {onSaved && (
          <div className="check__footer">
            {canEdit && (
              <button type="button" className="check__submit check__submit--edit" onClick={() => setIsSaved(false)}>
                Изменить прогноз
              </button>
            )}
            <button type="button" className="check__submit" onClick={onSaved}>На главную</button>
          </div>
        )}
      </div>
    )
  }

  /* ─── Active form ──────────────────────── */
  return (
    <div className="check">
      <div className="check__header">
        <span className="check__title">Билет прогноза</span>
      </div>

      <div className="check__match">
        <div className="check__match-label">Матч</div>
        <div className="check__teams">
          <div className="check__team">
            {home && <img src={home.logo} alt="" className="check__logo" />}
            <span>{homeTeam}</span>
          </div>
          <span className="check__vs">vs</span>
          <div className="check__team check__team--right">
            <span>{awayTeam}</span>
            {away && <img src={away.logo} alt="" className="check__logo" />}
          </div>
        </div>
      </div>

      {saveError && (
        <div className="check__error" style={{ padding: '8px 16px', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
          {saveError}
        </div>
      )}

      <div className="check__rows">
        {/* Step 1: Outcome */}
        <div className={`check__row ${activeStep === 'outcome' ? 'check__row--active' : ''} ${activeStep !== 'outcome' && hasOutcome ? 'check__row--done' : ''}`}>
          <span className="check__row-number">{hasOutcome && activeStep !== 'outcome' ? '✓' : '1'}</span>
          <span className="check__row-label">Исход</span>
          {hasOutcome && activeStep !== 'outcome' && (
            <>
              <span className="check__row-dots" />
              <span className="check__row-value">{outcome === '1' ? 'П1' : outcome === 'X' ? 'Ничья' : 'П2'}</span>
            </>
          )}
          {!hasOutcome && activeStep !== 'outcome' && <span className="check__row-skip">пропущено</span>}

          {activeStep === 'outcome' && (
            <div className="check__row-content">
              <div className="check__outcome-buttons">
                <button type="button" className={`check__outcome-btn ${outcome === '1' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome('1')}>П1</button>
                <button type="button" className={`check__outcome-btn ${outcome === 'X' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome('X')}>Ничья</button>
                <button type="button" className={`check__outcome-btn ${outcome === '2' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome('2')}>П2</button>
              </div>
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--skip" onClick={handleSkip}>Пропустить</button>
                <button type="button" className="check__btn check__btn--next" onClick={handleNext} disabled={!outcome}>Далее</button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Score */}
        <div className={`check__row ${activeStep === 'score' ? 'check__row--active' : ''} ${activeStep !== 'score' && hasScore ? 'check__row--done' : ''}`}>
          <span className="check__row-number">{hasScore && activeStep !== 'score' ? '✓' : '2'}</span>
          <span className="check__row-label">Точный счёт</span>
          {hasScore && activeStep !== 'score' && (
            <>
              <span className="check__row-dots" />
              <span className="check__row-value">{homeScore}:{awayScore}</span>
            </>
          )}
          {!hasScore && activeStep !== 'score' && <span className="check__row-skip">пропущено</span>}

          {activeStep === 'score' && (
            <div className="check__row-content">
              <div className="check__score-selects">
                <select value={homeScore} onChange={e => setHomeScore(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__score-select">
                  <option value="">—</option>
                  {currentScoreOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="check__score-sep">:</span>
                <select value={awayScore} onChange={e => setAwayScore(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__score-select">
                  <option value="">—</option>
                  {currentScoreOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {!showExtraScore && <button type="button" className="check__show-more" onClick={() => setShowExtraScore(true)}>Больше (5-10) ▼</button>}
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--back" onClick={handleBack}>Назад</button>
                <button type="button" className="check__btn check__btn--skip" onClick={handleSkip}>Пропустить</button>
                <button type="button" className="check__btn check__btn--next" onClick={handleNext} disabled={!hasScore}>Далее</button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Goals threshold */}
        <div className={`check__row ${activeStep === 'goals' ? 'check__row--active' : ''} ${activeStep !== 'goals' && hasGoals ? 'check__row--done' : ''}`}>
          <span className="check__row-number">{hasGoals && activeStep !== 'goals' ? '✓' : '3'}</span>
          <span className="check__row-label">Порог голов</span>
          {hasGoals && activeStep !== 'goals' && (
            <>
              <span className="check__row-dots" />
              <span className="check__row-value">{goalsTeam === 'home' ? homeTeam : awayTeam} ≥ {goalsThreshold}</span>
            </>
          )}
          {!hasGoals && activeStep !== 'goals' && <span className="check__row-skip">пропущено</span>}

          {activeStep === 'goals' && (
            <div className="check__row-content">
              <div className="check__goals-selects">
                <select value={goalsTeam} onChange={e => setGoalsTeam(e.target.value as GoalsTeam | '')} className="check__goals-select">
                  <option value="">Команда</option>
                  <option value="home">{homeTeam}</option>
                  <option value="away">{awayTeam}</option>
                </select>
                <span className="check__goals-text">забьёт ≥</span>
                <select value={goalsThreshold} onChange={e => setGoalsThreshold(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__score-select">
                  <option value="">—</option>
                  {currentGoalsOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="check__goals-text">голов</span>
              </div>
              {!showExtraGoals && <button type="button" className="check__show-more" onClick={() => setShowExtraGoals(true)}>Больше (5-10) ▼</button>}
              <div className="check__step-actions">
                <button type="button" className="check__btn check__btn--back" onClick={handleBack}>Назад</button>
                <button type="button" className="check__btn check__btn--skip" onClick={handleSkip}>Пропустить</button>
                <button type="button" className="check__btn check__btn--next" onClick={handleNext} disabled={!goalsTeam || goalsThreshold === ''}>Далее</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="check__footer">
        <div className="check__tear-line" />
        <button type="button" className="check__submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Сделать прогноз'}
        </button>
      </div>

      <div className="check__zigzag" />
    </div>
  )
}
