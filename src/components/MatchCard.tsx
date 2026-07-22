import { getTeamByName } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'

interface MatchCardProps {
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  homeScore?: number | null
  awayScore?: number | null
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  onPredict?: () => void
}

export function MatchCard({
  homeTeam,
  awayTeam,
  date,
  time,
  homeScore,
  awayScore,
  status,
  onPredict,
}: MatchCardProps) {
  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  return (
    <div className={`match-card match-card--${status.toLowerCase()}`}>
      <div className="match-card__header">
        <span className="match-card__date">{formatDate(date, 'short')}</span>
        <span className="match-card__weekday">{formatWeekday(date, 'long')}</span>
        <span className="match-card__time">{time}</span>
      </div>

      <div className="match-card__content">
        <div className="match-card__team match-card__team--home">
          {home && (
            <img
              src={home.logo}
              alt={home.name}
              className="match-card__logo"
            />
          )}
          <span className="match-card__name">{homeTeam}</span>
        </div>

        <div className="match-card__score">
          {status === 'FINISHED' || status === 'LIVE' ? (
            <span className="match-card__score-value">
              {homeScore ?? 0}
              <span className="match-card__score-separator">:</span>
              {awayScore ?? 0}
            </span>
          ) : (
            <span className="match-card__vs">VS</span>
          )}
        </div>

        <div className="match-card__team match-card__team--away">
          <span className="match-card__name">{awayTeam}</span>
          {away && (
            <img
              src={away.logo}
              alt={away.name}
              className="match-card__logo"
            />
          )}
        </div>
      </div>

      <div className="match-card__footer">
        <span className="match-card__status">
          {status === 'SCHEDULED' && 'Запланирован'}
          {status === 'LIVE' && '🔴 Идёт'}
          {status === 'FINISHED' && '✅ Завершён'}
        </span>

        {status === 'SCHEDULED' && onPredict && (
          <button className="match-card__predict-btn" onClick={onPredict}>
            Прогноз
          </button>
        )}
      </div>
    </div>
  )
}
