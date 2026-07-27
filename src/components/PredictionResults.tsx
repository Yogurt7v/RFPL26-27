import { useState, useEffect } from 'react'
import { getUserPredictions, type UserPrediction } from '../api/predictions'
import { getTeamByName } from '../lib/teams'
import { formatScore, formatDate } from '../lib/format'
import { Spinner } from './Spinner'

function formatGoalsThreshold(pred: UserPrediction): string {
  const parts: string[] = []
  if (pred.homeGoalsThreshold != null) parts.push(`${pred.homeTeam} ≥ ${pred.homeGoalsThreshold}`)
  if (pred.awayGoalsThreshold != null) parts.push(`${pred.awayTeam} ≥ ${pred.awayGoalsThreshold}`)
  return parts.length > 0 ? parts.join(', ') : '—'
}

interface PredictionResultsProps {
  userId: string
}

export function PredictionResults({ userId }: PredictionResultsProps) {
  const [predictions, setPredictions] = useState<UserPrediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserPredictions(userId)
        if (data.length === 0) {
          setError('У вас пока нет прогнозов')
        } else {
          setPredictions(data)
        }
      } catch (err) {
        console.error('Error loading predictions:', err)
        setError('Ошибка загрузки данных')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId])

  if (isLoading) {
    return <div className="prediction-results"><Spinner /></div>
  }

  if (error) {
    return <div className="prediction-results prediction-results--empty">{error}</div>
  }

  const totalPoints = predictions.reduce((sum, p) => sum + p.pointsEarned, 0)

  return (
    <div className="prediction-results">
      <div className="prediction-results__header">
        <span className="prediction-results__title">Мои прогнозы</span>
      </div>

      <div className="prediction-results__total">
        Всего очков: <strong>{totalPoints}</strong>
      </div>

      <table className="prediction-results__table">
        <thead>
          <tr>
            <th className="prediction-results__th">Матч</th>
            <th className="prediction-results__th">Дата</th>
            <th className="prediction-results__th">Прогноз</th>
            <th className="prediction-results__th">Результат</th>
            <th className="prediction-results__th prediction-results__th--pts">Очки</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map(pred => {
            const home = getTeamByName(pred.homeTeam)
            const away = getTeamByName(pred.awayTeam)

            return (
              <tr key={pred.id} className="prediction-results__row">
                <td className="prediction-results__td prediction-results__td--match">
                  <div className="prediction-results__teams">
                    {home && <img src={home.logo} alt="" className="prediction-results__logo" />}
                    <span>{pred.homeTeam}</span>
                  </div>
                  <div className="prediction-results__teams">
                    {away && <img src={away.logo} alt="" className="prediction-results__logo" />}
                    <span>{pred.awayTeam}</span>
                  </div>
                </td>
                <td className="prediction-results__td">
                  {formatDate(pred.matchDate, 'short')}
                </td>
                <td className="prediction-results__td">
                  {pred.predictedHomeScore != null && pred.predictedAwayScore != null
                    ? formatScore(pred.predictedHomeScore, pred.predictedAwayScore)
                    : pred.outcome || formatGoalsThreshold(pred)}
                </td>
                <td className="prediction-results__td">
                  {pred.actualHomeScore != null && pred.actualAwayScore != null
                    ? formatScore(pred.actualHomeScore, pred.actualAwayScore)
                    : '—'}
                </td>
                <td className="prediction-results__td prediction-results__td--pts">
                  <strong>{pred.pointsEarned}</strong>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="prediction-results__zigzag" />
    </div>
  )
}
