import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveMatches } from '../hooks/useLiveMatches'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'
import { useScrollToElement } from '../hooks/useScrollToElement'
import { schedule, getMatchesByTeam, getNextMatch, getRoundByMatchId } from '../lib/schedule'
import { teams } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'
import { MatchCard } from './MatchCard'
import { FavoriteSheet } from './FavoriteSheet'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

interface RoundGroup {
  label: string
  days: {
    dateKey: string
    dateLabel: string
    matches: ReturnType<typeof scheduleToMatch>[]
  }[]
}

function scheduleToMatch(m: (typeof schedule)[number]) {
  return { ...m, homeScore: undefined, awayScore: undefined, status: 'SCHEDULED' as const }
}

const rounds = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  label: `Тур ${i + 1}`,
}))

export function MatchList({ onPredict }: MatchListProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const roundParam = searchParams.get('round')
  const teamParam = searchParams.get('team')
  const [nextMatchId, setNextMatchId] = useState<string | undefined>()
  const [sheetMatchId, setSheetMatchId] = useState<string | null>(null)
  const initialRoundRef = useRef(1)
  const hasInitializedRef = useRef(false)

  const { user } = useAuth()
  const {
    isFavorite,
    toggleFavorite,
    favoriteCount,
    starlets,
    glowLevel,
    getMatchFavoritesList,
  } = useFavorites()

  const selectedTeam = teamParam ?? ''
  const selectedRound = roundParam ? Number(roundParam) : initialRoundRef.current

  const setFilter = (params: { round?: number; team?: string }) => {
    const next = new URLSearchParams(searchParams)
    if (params.round !== undefined) {
      next.set('round', String(params.round))
    }
    if (params.team !== undefined) {
      if (params.team) next.set('team', params.team)
      else {
        next.delete('team')
        if (!next.has('round') && initialRoundRef.current) {
          next.set('round', String(initialRoundRef.current))
        }
      }
    }
    setSearchParams(next, { replace: true })
  }

  const { matches: liveMatches } = useLiveMatches(selectedRound, selectedTeam)

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const next = getNextMatch()
    if (next) {
      setNextMatchId(next.id)
      const round = getRoundByMatchId(next.id)
      if (round) initialRoundRef.current = round
    }

    if (!roundParam && !teamParam && initialRoundRef.current) {
      setSearchParams({ round: String(initialRoundRef.current) }, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      const nextForTeam = findNextMatchForTeam(selectedTeam)
      setNextMatchId(nextForTeam)
    }
  }, [selectedTeam])

  useScrollToElement(nextMatchId ? `match-${nextMatchId}` : null)

  const allMatches = useMemo(() => {
    const base = selectedTeam
      ? getTeamMatches(selectedTeam)
      : schedule.filter(m => m.round === selectedRound).map(scheduleToMatch)

    if (liveMatches.length === 0) return base

    return base.map(m => {
      const live = liveMatches.find(l =>
        l.homeTeam === m.homeTeam && l.awayTeam === m.awayTeam
      )
      return live
        ? { ...m, homeScore: live.homeScore, awayScore: live.awayScore, status: live.status }
        : m
    })
  }, [selectedTeam, selectedRound, liveMatches])

  const groupedMatches = useMemo(() => {
    const roundMap = new Map<number, RoundGroup>()

    for (const match of allMatches) {
      let roundGroup = roundMap.get(match.round)
      if (!roundGroup) {
        roundGroup = { label: `Тур ${match.round}`, days: [] }
        roundMap.set(match.round, roundGroup)
      }

      const dateKey = match.date
      let dayGroup = roundGroup.days.find(d => d.dateKey === dateKey)
      if (!dayGroup) {
        const d = new Date(dateKey)
        const dateLabel = `${formatDate(d, 'long')}, ${formatWeekday(d, 'long')}`
        dayGroup = { dateKey, dateLabel, matches: [] }
        roundGroup.days.push(dayGroup)
      }
      dayGroup.matches.push(match)
    }

    return Array.from(roundMap.values())
  }, [allMatches])

  const handleFavoriteClick = useCallback((matchId: string) => {
    setSheetMatchId(matchId)
  }, [])

  return (
    <div className="match-list">
      <div className="match-list__header">
        <h2>Матчи</h2>
        <div className="match-list__filters">
          {(selectedTeam || selectedRound !== initialRoundRef.current) && (
            <button
              className="match-list__reset"
              onClick={() => setSearchParams({}, { replace: true })}
              title="Сбросить фильтры"
            >
              ×
            </button>
          )}
          {!selectedTeam && (
            <select
              value={selectedRound}
              onChange={e => setFilter({ round: Number(e.target.value) })}
              className="match-list__select"
            >
              {rounds.map(r => (
                <option key={r.number} value={r.number}>
                  Тур {r.number}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedTeam}
            onChange={e => setFilter({ team: e.target.value })}
            className="match-list__select"
          >
            <option value="">Все команды</option>
            {teams.map(t => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="match-list__grid">
        {groupedMatches.length === 0 ? (
          <div className="match-list__empty">
            {selectedTeam
              ? `Нет матчей для команды ${selectedTeam}`
              : 'Нет матчей для отображения'}
          </div>
        ) : (
          groupedMatches.map(group => (
            <div key={group.label} className="match-list__group">
              <h3 className="match-list__date-header">{group.label}</h3>
              {group.days.map(day => (
                <div key={day.dateKey} className="match-list__day-group">
                  <h4 className="match-list__day-header">{day.dateLabel}</h4>
                  <div className="match-list__group-items">
                    {day.matches.map(match => (
                      <MatchCard
                        key={match.id}
                        matchId={match.id}
                        homeTeam={match.homeTeam}
                        awayTeam={match.awayTeam}
                        date={match.date}
                        time={match.time}
                        homeScore={match.homeScore}
                        awayScore={match.awayScore}
                        status={match.status}
                        isNext={match.id === nextMatchId}
                        id={match.id === nextMatchId ? `match-${match.id}` : undefined}
                        onClick={onPredict ? () => onPredict(match.id) : undefined}
                        isFavorite={isFavorite(match.id)}
                        favoriteCount={favoriteCount(match.id)}
                        starlets={starlets(match.id)}
                        glowLevel={glowLevel(match.id)}
                        onFavoriteToggle={user ? () => toggleFavorite(match.id) : undefined}
                        onFavoriteClick={() => handleFavoriteClick(match.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <FavoriteSheet
        matchId={sheetMatchId ?? ''}
        isOpen={sheetMatchId !== null}
        onClose={() => setSheetMatchId(null)}
        getFavorites={getMatchFavoritesList}
      />
    </div>
  )
}

function getTeamMatches(teamName: string) {
  return getMatchesByTeam(teamName)
}

function findNextMatchForTeam(teamName: string): string | undefined {
  const now = new Date()
  const teamSchedule = getMatchesByTeam(teamName)
  for (const match of teamSchedule) {
    const matchDate = new Date(`${match.date}T${match.time}:00`)
    if (matchDate > now) return match.id
  }
  return undefined
}
