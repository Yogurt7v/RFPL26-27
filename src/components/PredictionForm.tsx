import { useEffect, useState } from 'react'
import { getTeamByName } from '../lib/teams'
import { validatePrediction, type Outcome } from '../lib/scoring'
import type { TeamFormMatch } from '../lib/form'
import { TeamForm } from './TeamForm'
import { Modal } from './Modal'

export interface PredictionFormData {
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: Outcome | null
  homeGoalsThreshold: number | null
  awayGoalsThreshold: number | null
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
  onDelete?: () => void
  canEdit?: boolean
  homeForm?: TeamFormMatch[]
  awayForm?: TeamFormMatch[]
  homeFormLoading?: boolean
  awayFormLoading?: boolean
}

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5]
const GOALS_OPTIONS = [2, 3, 4, 5]

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
  onDelete,
  homeForm,
  awayForm,
  homeFormLoading = false,
  awayFormLoading = false,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState<number | ''>(initialValues?.predictedHomeScore ?? '')
  const [awayScore, setAwayScore] = useState<number | ''>(initialValues?.predictedAwayScore ?? '')
  const [outcome, setOutcome] = useState<Outcome | ''>((initialValues?.outcome as Outcome) || '')
  const [homeGoalsThreshold, setHomeGoalsThreshold] = useState<number | ''>(initialValues?.homeGoalsThreshold ?? '')
  const [awayGoalsThreshold, setAwayGoalsThreshold] = useState<number | ''>(initialValues?.awayGoalsThreshold ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(!!initialValues)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const initialSnapshot = JSON.stringify(initialValues)

  useEffect(() => {
    if (!initialValues) return
    setHomeScore(initialValues.predictedHomeScore ?? '')
    setAwayScore(initialValues.predictedAwayScore ?? '')
    setOutcome((initialValues.outcome as Outcome) || '')
    setHomeGoalsThreshold(initialValues.homeGoalsThreshold ?? '')
    setAwayGoalsThreshold(initialValues.awayGoalsThreshold ?? '')
    setIsSaved(true)
  }, [initialSnapshot])

  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  const buildPrediction = (): PredictionFormData => ({
    predictedHomeScore: homeScore !== '' ? homeScore : null,
    predictedAwayScore: awayScore !== '' ? awayScore : null,
    outcome: (outcome as Outcome) || null,
    homeGoalsThreshold: homeGoalsThreshold !== '' ? homeGoalsThreshold : null,
    awayGoalsThreshold: awayGoalsThreshold !== '' ? awayGoalsThreshold : null,
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

  const hasScore = homeScore !== '' && awayScore !== ''

  const formatGoalsSummary = () => {
    const parts: string[] = []
    if (homeGoalsThreshold !== '') parts.push(`${homeTeam} ≥ ${homeGoalsThreshold}`)
    if (awayGoalsThreshold !== '') parts.push(`${awayTeam} ≥ ${awayGoalsThreshold}`)
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  /* ─── Saved state ──────────────────────── */
  if (isSaved) {
    return (
      <><div className="check check--saved">
        <div className="check__header check__header--success">
          <span className="check__title">Прогноз принят</span>
        </div>

        <div className="check__saved-match">
          {homeTeam}
          <span className="check__score">
            {actualHomeScore != null && actualAwayScore != null ? `${actualHomeScore}:${actualAwayScore}` : ':'}
          </span>
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
              {formatGoalsSummary()}
            </span>
          </div>
        </div>

        {isFinished && points != null && points !== 0 && (
          <>
            <div className="check__divider" />
            <div className={`check__winnings${points < 0 ? ' check__winnings--penalty' : ''}`}>
              <div className="check__winnings-label">{points > 0 ? 'Выигрыш' : 'Штраф'}</div>
              <div className={`check__winnings-value${points < 0 ? ' check__winnings-value--negative' : ''}`}>{points > 0 ? '+' : ''}{points} очков</div>
            </div>
          </>
        )}

        {onSaved && canEdit && (
          <div className="check__footer">
            <div className="check__footer-row">
              <button type="button" className="check__submit check__submit--edit" onClick={() => setIsSaved(false)}>
                Изменить прогноз
              </button>
              {onDelete && !isFinished && (
                <button
                  type="button"
                  className="check__delete-btn"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Удалить прогноз"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Удалить прогноз">
        <p className="modal__text">Вы уверены, что хотите удалить прогноз на матч {homeTeam} — {awayTeam}?</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setShowDeleteModal(false)}>Отмена</button>
          <button type="button" className="btn btn--primary btn--danger" onClick={() => { setShowDeleteModal(false); onDelete?.() }}>Удалить</button>
        </div>
      </Modal></>
    )
  }

  /* ─── Active form ──────────────────────── */
  return (
    <div className="check">
      <div className="check__header">
        <span className="check__title">Билет прогноза</span>
      </div>

      <div className="check__match">
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

      {homeForm !== undefined && awayForm !== undefined && !homeFormLoading && !awayFormLoading && (
        <div className="check__form-block">
          <div className="check__form-side">
            {/*<span className="check__form-team">{homeTeam}</span>*/}
            <TeamForm teamName={homeTeam} results={homeForm} />
          </div>
          <span className="check__form-vs"></span>
          <div className="check__form-side">
            {/*<span className="check__form-team">{awayTeam}</span>*/}
            <TeamForm teamName={awayTeam} results={awayForm} />
          </div>
        </div>
      )}

      {saveError && (
        <div className="check__error" style={{ padding: '8px 16px', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
          {saveError}
        </div>
      )}

      <div className="check__sections">
        {/* Outcome toggle */}
        <div className="check__section">
          <div className="check__section-label">Исход</div>
          <div className="check__outcome-toggle">
            <button type="button" className={`check__outcome-btn ${outcome === '1' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome(outcome === '1' ? '' : '1')}>
              <span className="check__outcome-main">П1</span>
              <span className="check__outcome-sub">Хозяева</span>
            </button>
            <button type="button" className={`check__outcome-btn ${outcome === 'X' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome(outcome === 'X' ? '' : 'X')}>
              <span className="check__outcome-main">X</span>
              <span className="check__outcome-sub">Ничья</span>
            </button>
            <button type="button" className={`check__outcome-btn ${outcome === '2' ? 'check__outcome-btn--active' : ''}`} onClick={() => setOutcome(outcome === '2' ? '' : '2')}>
              <span className="check__outcome-main">П2</span>
              <span className="check__outcome-sub">Гости</span>
            </button>
          </div>
        </div>

        {/* Score */}
        <div className="check__section">
          <div className="check__section-label">Точный счёт</div>
          <div className="check__score-selects">
            <select value={homeScore} onChange={e => setHomeScore(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__score-select">
              <option value="" disabled>—</option>
              {SCORE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="check__score-sep">:</span>
            <select value={awayScore} onChange={e => setAwayScore(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__score-select">
              <option value="" disabled>—</option>
              {SCORE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Goals threshold */}
        <div className="check__section">
          <div className="check__section-label">Порог голов</div>
          <div className="check__goals-rows">
            <div className="check__goals-row">
              <span className="check__goals-label">{homeTeam}</span>
              <span className="check__goals-text">забьёт ≥</span>
              <select value={homeGoalsThreshold} onChange={e => setHomeGoalsThreshold(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__goals-select">
                <option value="" disabled>—</option>
                {GOALS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="check__goals-text">голов</span>
            </div>
            <div className="check__goals-row">
              <span className="check__goals-label">{awayTeam}</span>
              <span className="check__goals-text">забьёт ≥</span>
              <select value={awayGoalsThreshold} onChange={e => setAwayGoalsThreshold(e.target.value === '' ? '' : parseInt(e.target.value))} className="check__goals-select">
                <option value="" disabled>—</option>
                {GOALS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="check__goals-text">голов</span>
            </div>
          </div>
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
