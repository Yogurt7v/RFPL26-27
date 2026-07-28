import { getTeamByName } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'

interface MatchCardProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  homeScore?: number | null
  awayScore?: number | null
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  onClick?: () => void
  isNext?: boolean
  id?: string
}

export function MatchCard({
  matchId,
  homeTeam,
  awayTeam,
  date,
  time,
  homeScore,
  awayScore,
  status,
  onClick,
  isNext = false,
  id,
}: MatchCardProps) {
  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  return (
    <div
      id={id}
      className={`match-card match-card--${status.toLowerCase()} ${isNext ? 'match-card--next' : ''}`}
      {...(onClick ? { onClick, role: 'button' as const, tabIndex: 0 } : {})}
    >
      {home?.logoLarge && (
        <img className="match-card__watermark match-card__watermark--home" src={home.logoLarge} alt="" />
      )}
      {away?.logoLarge && (
        <img className="match-card__watermark match-card__watermark--away" src={away.logoLarge} alt="" />
      )}

      <div className="match-card__meta">
        <span>{formatDate(date, 'short')}</span>
        <span className="match-card__meta-sep">·</span>
        <span>{formatWeekday(date, 'long')}</span>
        <span className="match-card__meta-sep">·</span>
        <span className="match-card__time">{time}</span>
      </div>

      <div className="match-card__main">
        <div className="match-card__team">
          <span className="match-card__name">{homeTeam}</span>
        </div>

        <div className="match-card__score">
          {status === 'FINISHED' || status === 'LIVE' ? (
            <span className="match-card__score-value">
              {homeScore ?? 0}
              <span className="match-card__score-sep">:</span>
              {awayScore ?? 0}
            </span>
          ) : (
            <span className="match-card__vs">VS</span>
          )}
        </div>

        <div className="match-card__team">
          <span className="match-card__name">{awayTeam}</span>
        </div>
      </div>

      <div className="match-card__footer">
        <span className="match-card__status">
          {status === 'LIVE' && 'Идёт'}
        </span>


      </div>
    </div>
  )
}
