import { useState, useEffect } from 'react'
import { getTeamByName } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'
import { StarIcon } from './Icons'
import { isFavorite, toggleFavorite, getFavorites } from '../api/favorites'
import { useAuth } from '../hooks/useAuth'

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
}: MatchCardProps) {
  const { user, isLoading } = useAuth()
  const [isFav, setIsFav] = useState(false)
  const [favUsers, setFavUsers] = useState<string[]>([])
  const [showFavTooltip, setShowFavTooltip] = useState(false)

  const home = getTeamByName(homeTeam)
  const away = getTeamByName(awayTeam)

  useEffect(() => {
    if (isLoading) return
    let cancelled = false

    async function load() {
      try {
        const [favorites, fav] = await Promise.all([
          getFavorites(matchId),
          user ? isFavorite(user.id, matchId) : Promise.resolve(false),
        ])
        if (cancelled) return
        setFavUsers(favorites.map(f => f.username || 'Аноним').filter(Boolean))
        setIsFav(fav)
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, isLoading, matchId])

  const handleToggleFavorite = async () => {
    if (!user) return
    const newState = await toggleFavorite(user.id, matchId)
    setIsFav(newState)
    const favorites = await getFavorites(matchId)
    setFavUsers(favorites.map(f => f.username || 'Аноним').filter(Boolean))
  }

  return (
    <div
      className={`match-card match-card--${status.toLowerCase()} ${isNext ? 'match-card--next' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
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
          {status === 'SCHEDULED' && 'Запланирован'}
          {status === 'LIVE' && 'Идёт'}
          {status === 'FINISHED' && 'Завершён'}
        </span>

        {user && (
          <div
            className="match-card__fav-wrapper"
            onMouseEnter={() => setShowFavTooltip(true)}
            onMouseLeave={() => setShowFavTooltip(false)}
          >
            <button
              className={`match-card__fav-btn ${isFav ? 'match-card__fav-btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleToggleFavorite() }}
              title={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
            >
              <StarIcon size={16} filled={isFav} />
              {favUsers.length > 0 && (
                <span className="match-card__fav-count">{favUsers.length}</span>
              )}
            </button>
            {showFavTooltip && favUsers.length > 0 && (
              <div className="match-card__fav-tooltip">
                {favUsers.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
