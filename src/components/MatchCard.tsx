import { getTeamByName } from '../lib/teams'
import { formatScore } from '../lib/format'

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
      <div className="match-card__date">
        {date} {time}
      </div>

      <div className="match-card__teams">
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
              {formatScore(homeScore ?? 0, awayScore ?? 0)}
            </span>
          ) : (
            <span className="match-card__vs">vs</span>
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

      <div className="match-card__status">
        {status === 'SCHEDULED' && 'Запланирован'}
        {status === 'LIVE' && 'Идёт'}
        {status === 'FINISHED' && 'Завершён'}
      </div>

      {status === 'SCHEDULED' && onPredict && (
        <button className="match-card__predict-btn" onClick={onPredict}>
          Сделать прогноз
        </button>
      )}
    </div>
  )
}
