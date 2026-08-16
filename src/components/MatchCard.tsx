import { useState } from 'react'
import { getTeamByName } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'
import { GlassCard } from './GlassCard'

interface Starlet {
  letter: string
  username: string
  userId: string
}

interface MatchCardProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  homeScore?: number | null
  awayScore?: number | null
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'HALFTIME'
  onClick?: () => void
  isNext?: boolean
  id?: string
  isFavorite?: boolean
  favoriteCount?: number
  starlets?: Starlet[]
  glowLevel?: 0 | 1 | 2 | 3
  hasPredicted?: boolean
  onFavoriteToggle?: () => void
  onFavoriteClick?: () => void
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
  isFavorite = false,
  favoriteCount = 0,
  starlets = [],
  glowLevel = 0,
  hasPredicted = false,
  onFavoriteToggle,
  onFavoriteClick,
}: MatchCardProps) {
  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  const glowClass = glowLevel > 0 ? ` match-card--glow-${glowLevel}` : ''
  const [starAnimating, setStarAnimating] = useState(false)

  const handleStarToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFavoriteToggle()
    setStarAnimating(true)
    setTimeout(() => setStarAnimating(false), 300)
  }

  return (
    <div
      id={id}
      className={`match-card match-card--${status.toLowerCase()}${isNext ? ' match-card--next' : ''}${glowClass}`}
      {...(onClick ? { onClick, role: 'button' as const, tabIndex: 0 } : {})}
    >
      {hasPredicted && <div className="match-card__predicted">✓</div>}

      {home?.logoLarge && (
        <img className="match-card__watermark match-card__watermark--home" src={home.logoLarge} alt="" />
      )}
      {away?.logoLarge && (
        <img className="match-card__watermark match-card__watermark--away" src={away.logoLarge} alt="" />
      )}

      {onFavoriteToggle && (
        <div className="match-card__favorites-corner">
          {starlets.length > 0 && (
            <div
              className="match-card__starlets"
              onClick={e => {
                e.stopPropagation()
                onFavoriteClick?.()
              }}
            >
              {starlets.map(s => (
                <span key={s.userId} className="match-card__starlet" title={s.username}>
                  <span className="match-card__starlet-letter">{s.letter}</span>
                </span>
              ))}
              {(() => {
                const overflow = favoriteCount - starlets.length - (isFavorite ? 1 : 0)
                return overflow > 0 ? <span className="match-card__favorites-more">+{overflow}</span> : null
              })()}
            </div>
          )}

          <button
            className={`match-card__star-btn ${isFavorite ? 'match-card__star-btn--active' : ''}${starAnimating ? ' match-card__star-btn--pop' : ''}`}
            onClick={handleStarToggle}
            aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          >
            ★
          </button>
        </div>
      )}

      <div className="match-card__meta">
      <GlassCard>
        {/*<span>{formatDate(date, 'short')}</span>*/}
        {/*<span className="match-card__meta-sep">·</span>*/}
        <span>{formatWeekday(date, 'long')}</span>
        <span className="match-card__meta-sep">·</span>
        <span className="match-card__time">{time}</span>
      </GlassCard>
        </div>

      <div className="match-card__main">
        <div className="match-card__team">
          <span className="match-card__name">{homeTeam}</span>
        </div>

        <div className="match-card__score">
          {status === 'FINISHED' || status === 'LIVE' || status === 'HALFTIME' ? (
            <span className="match-card__score-value">
              {homeScore ?? 0}
              <span className="match-card__score-sep">:</span>
              {awayScore ?? 0}
            </span>
          ) : (
            <span className="match-card__vs">:</span>
          )}
        </div>

        <div className="match-card__team">
          <span className="match-card__name">{awayTeam}</span>
        </div>
      </div>

      <div className="match-card__footer">
        {status !== 'SCHEDULED' && (
          <span className="match-card__status">
            {status === 'LIVE' ?  <span className="match-card__status-dot" >'LIVE'</span> : null}
            {status === 'HALFTIME' ? 'ПЕРЕРЫВ' : null}
          </span>
        )}
      </div>
    </div>
  )
}
