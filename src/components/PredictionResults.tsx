import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUserPredictions, type UserPrediction } from '../api/predictions'
import { getTeamByName } from '../lib/teams'
import { formatScore, formatDate } from '../lib/format'
import { GlassCard } from './GlassCard'
import { schedule } from '../lib/schedule'

function formatGoalsThreshold(pred: UserPrediction): string {
  const parts: string[] = []
  if (pred.homeGoalsThreshold != null) parts.push(`${pred.homeTeam} ≥ ${pred.homeGoalsThreshold}`)
  if (pred.awayGoalsThreshold != null) parts.push(`${pred.awayTeam} ≥ ${pred.awayGoalsThreshold}`)
  return parts.length > 0 ? parts.join(', ') : '—'
}

function getMatchSlug(homeTeam: string, awayTeam: string): string | undefined {
  const m = schedule.find(s => s.homeTeam === homeTeam && s.awayTeam === awayTeam)
  return m?.id
}

function formatPrediction(pred: UserPrediction): string {
  if (pred.predictedHomeScore != null && pred.predictedAwayScore != null) {
    return formatScore(pred.predictedHomeScore, pred.predictedAwayScore)
  }
  return pred.outcome || formatGoalsThreshold(pred)
}

interface PredictionResultsProps {
  userId: string
}

export function PredictionResults({ userId }: PredictionResultsProps) {
  const navigate = useNavigate()

  const { data: predictions = [], isLoading, error } = useQuery({
    queryKey: ['predictions', userId],
    queryFn: () => getUserPredictions(userId),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="prediction-results">
        <div className="prediction-results__header">
          <span className="prediction-results__title">Мои прогнозы</span>
        </div>
        <div className="prediction-results__total">
          <div className="skeleton" style={{ width: 120, height: 18, margin: '0 auto' }} />
        </div>
        <div className="prediction-results__list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="prediction-results__item">
              <div className="prediction-results__skeleton-card">
                <div className="prediction-results__skeleton-top">
                  <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  <div className="skeleton" style={{ width: 80, height: 16 }} />
                  <div className="skeleton" style={{ width: 20, height: 16 }} />
                  <div className="skeleton" style={{ width: 80, height: 16 }} />
                  <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  <div className="skeleton" style={{ width: 60, height: 14, marginLeft: 'auto' }} />
                </div>
                <div className="prediction-results__skeleton-bottom">
                  <div className="skeleton" style={{ width: 140, height: 14 }} />
                  <div className="skeleton" style={{ width: 140, height: 14 }} />
                  <div className="skeleton" style={{ width: 80, height: 14 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="prediction-results prediction-results--empty">Ошибка загрузки данных</div>
  }

  if (predictions.length === 0) {
    return <div className="prediction-results prediction-results--empty">У вас пока нет прогнозов</div>
  }

  const totalPoints = predictions.reduce((sum, p) => sum + p.pointsEarned, 0) + 30

  return (
    <div className="prediction-results">
      <div className="prediction-results__header">
        <span className="prediction-results__title">Мои прогнозы</span>
      </div>

      <div className="prediction-results__total">
        Всего очков: <strong>{totalPoints}</strong>
      </div>

      <div className="prediction-results__list">
        {predictions.map(pred => {
          const home = getTeamByName(pred.homeTeam)
          const away = getTeamByName(pred.awayTeam)
          const matchSlug = getMatchSlug(pred.homeTeam, pred.awayTeam)
          const predicted = formatPrediction(pred)
          const actual = pred.actualHomeScore != null && pred.actualAwayScore != null
            ? formatScore(pred.actualHomeScore, pred.actualAwayScore)
            : null

          return (
            <div
              key={pred.id}
              className="prediction-results__item"
              onClick={() => matchSlug && navigate(`/predict/${matchSlug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' && matchSlug) navigate(`/predict/${matchSlug}`) }}
            >
              <GlassCard>
                <div className="prediction-results__item-top">
                  <div className="prediction-results__item-teams">
                    {home && <img src={home.logo} alt="" className="prediction-results__item-logo" />}
                    <span className="prediction-results__item-team">{pred.homeTeam}</span>
                    <span className="prediction-results__item-vs">vs</span>
                    <span className="prediction-results__item-team">{pred.awayTeam}</span>
                    {away && <img src={away.logo} alt="" className="prediction-results__item-logo" />}
                  </div>
                  <span className="prediction-results__item-date">{formatDate(pred.matchDate, 'short')}</span>
                </div>
                <div className="prediction-results__item-bottom">
                  <span className="prediction-results__item-info">
                    Прогноз: <strong>{predicted}</strong>
                  </span>
                  <span className="prediction-results__item-info">
                    Результат: <strong>{actual || '—'}</strong>
                  </span>
                  <span className="prediction-results__item-info">
                    Очки: <strong>{pred.pointsEarned}</strong>
                  </span>
                </div>
              </GlassCard>
            </div>
          )
        })}
      </div>

      <div className="prediction-results__zigzag" />
    </div>
  )
}
