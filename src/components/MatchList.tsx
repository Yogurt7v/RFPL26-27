import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useLiveMatches } from '../hooks/useLiveMatches'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'
import { useScrollToElement } from '../hooks/useScrollToElement'
import { getSchedule, type ScheduleEntry } from '../api/matches'
import { teams } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'
import { MatchCard } from './MatchCard'
import { FavoriteSheet } from './FavoriteSheet'
import { getUserPredictedMatchKeys, getCachedPredictedKeys } from '../api/predictions'
import { triggerSync } from '../api/sync'
import { DataStatusChip } from './DataStatusChip'
import { useSyncStateQuery, SYNC_STATE_QUERY_KEY } from '../hooks/useSyncState'

// Вспомогательные функции для работы с расписанием
const MATCH_DURATION_MS = 120 * 60 * 1000

function getMatchStartTime(match: ScheduleEntry): Date {
  return new Date(`${match.date}T${match.time}:00+03:00`)
}

function findNextMatch(matches: ScheduleEntry[]): ScheduleEntry | undefined {
  const now = Date.now()
  return matches.find(m => now < getMatchStartTime(m).getTime() + MATCH_DURATION_MS)
}

function getNextMatch(matches: ScheduleEntry[]): ScheduleEntry | undefined {
  return findNextMatch(matches)
}

function getMatchesByTeam(matches: ScheduleEntry[], teamName: string): ScheduleEntry[] {
  return matches.filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
}

function getRoundByMatchId(matches: ScheduleEntry[], matchId: string): number | undefined {
  const match = matches.find(m => m.id === matchId)
  return match?.round
}

function getCurrentRound(matches: ScheduleEntry[]): number {
  const next = getNextMatch(matches)
  if (next) return next.round
  if (matches.length === 0) return 1
  return Math.max(...matches.map(m => m.round))
}

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

interface DisplayMatch {
  id: string
  round: number
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  stadium?: string
  homeScore?: number
  awayScore?: number
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'HALFTIME'
}

interface RoundGroup {
  label: string
  days: {
    dateKey: string
    dateLabel: string
    matches: DisplayMatch[]
  }[]
}

function scheduleToMatch(m: ScheduleEntry): DisplayMatch {
  return { 
    ...m, 
    homeScore: undefined, 
    awayScore: undefined, 
    status: 'SCHEDULED'
  }
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
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const initialRoundRef = useRef(1)
  const hasInitializedRef = useRef(false)

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const {  syncState } = useSyncStateQuery()
  const {
    isFavorite,
    toggleFavorite,
    favoriteCount,
    starlets,
    glowLevel,
  } = useFavorites()

  const selectedTeam = teamParam ?? ''

  // Получаем расписание из Supabase
  const {  scheduleMatches = [], isLoading: isLoadingSchedule, error: scheduleError } = useQuery({
    queryKey: ['schedule'],
    queryFn: getSchedule,
    staleTime: 5 * 60 * 1000,
  })

  // Определяем начальный тур
  useEffect(() => {
    if (hasInitializedRef.current || scheduleMatches.length === 0) return
    hasInitializedRef.current = true

    const next = getNextMatch(scheduleMatches)
    if (next) {
      setNextMatchId(next.id)
      const round = getRoundByMatchId(scheduleMatches, next.id)
      if (round) initialRoundRef.current = round
    } else {
      initialRoundRef.current = getCurrentRound(scheduleMatches)
    }

    // Устанавливаем начальный тур в URL только если его там нет
    if (!roundParam && !teamParam && initialRoundRef.current) {
        setSearchParams({ round: String(initialRoundRef.current) }, { replace: true })
    }
  },  [scheduleMatches, roundParam, teamParam, setSearchParams])

  const selectedRound = roundParam ? Number(roundParam) : initialRoundRef.current

  const setFilter = (params: { round?: number; team?: string }) => {
    const next = new URLSearchParams(searchParams)
    if (params.round !== undefined) {
      next.set('round', String(params.round))
    }
    if (params.team !== undefined) {
      if (params.team) {
        next.set('team', params.team)
        const nextForTeam = findNextMatch(getMatchesByTeam(scheduleMatches, params.team))
        setNextMatchId(nextForTeam?.id)
      } else {
        next.delete('team')
        const generalNext = getNextMatch(scheduleMatches)
        setNextMatchId(generalNext?.id)
        if (!next.has('round') && initialRoundRef.current) {
          next.set('round', String(initialRoundRef.current))
        }
      }
    }
    setSearchParams(next, { replace: true })
  }

  const {  predictedKeys = new Set<string>() } = useQuery({
    queryKey: ['predictions', 'keys', user?.id],
    queryFn: () => getUserPredictedMatchKeys(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
    retry: 1,
    initialData: user?.id ? () => getCachedPredictedKeys(user.id) : undefined,
    placeholderData: keepPreviousData,
  })

  const { matches: liveMatches } = useLiveMatches(selectedRound, selectedTeam)

  useEffect(() => {
    if (selectedTeam) {
      const nextForTeam = findNextMatch(getMatchesByTeam(scheduleMatches, selectedTeam))
      setNextMatchId(nextForTeam?.id)
    }
  }, [selectedTeam, scheduleMatches])

  useScrollToElement(nextMatchId ? `match-${nextMatchId}` : null)

  const allMatches = useMemo(() => {
    const base = selectedTeam
      ? getMatchesByTeam(scheduleMatches, selectedTeam).map(scheduleToMatch)
      : scheduleMatches.filter(m => m.round === selectedRound).map(scheduleToMatch)

    if (liveMatches.length === 0) return base

    return base.map(m => {
      const live = liveMatches.find(l =>
        l.homeTeam === m.homeTeam && l.awayTeam === m.awayTeam
      )
      return live
        ? { ...m, homeScore: live.homeScore ?? undefined, awayScore: live.awayScore ?? undefined, status: live.status }
        : m
    })
  }, [selectedTeam, selectedRound, liveMatches, scheduleMatches])

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

    // Сортируем дни по дате (от ранних к поздним)
    const result = Array.from(roundMap.values())
    for (const group of result) {
      group.days.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    }

    return result
  }, [allMatches])

  const handleFavoriteClick = useCallback((matchId: string) => {
    setSheetMatchId(matchId)
  }, [])

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)
    try {
      await triggerSync()
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      queryClient.invalidateQueries({ queryKey: ['standings'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: SYNC_STATE_QUERY_KEY })
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Не удалось обновить данные')
    } finally {
      setIsSyncing(false)
    }
  }, [queryClient])

  const liveCount = allMatches.filter(m => m.status === 'LIVE' || m.status === 'HALFTIME').length

  if (isLoadingSchedule) {
    return (
      <div className="match-list">
        <div className="match-list__loading">Загрузка расписания...</div>
      </div>
    )
  }

  if (scheduleError) {
    return (
      <div className="match-list">
        <div className="match-list__error">
          Ошибка загрузки расписания: {scheduleError.message}
        </div>
      </div>
    )
  }

  return (
    <div className="match-list">
      <div className="round-header">
        <div className="round-header__round">Тур {selectedRound}</div>
        <div className="round-header__accent" />
      </div>

      <div className="match-list__filters">
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
        {(selectedTeam || selectedRound !== 1) && (
          <button
            className="match-list__reset"
            onClick={() => {
              const generalNext = getNextMatch(scheduleMatches)
              setNextMatchId(generalNext?.id)
              setSearchParams({}, { replace: true })
            }}
            title="Сбросить фильтры"
          >
            ×
          </button>
        )}
        <button
          className="match-list__sync"
          onClick={handleSync}
          disabled={isSyncing}
          title="Принудительно обновить данные матчей"
        >
          <span className={`match-list__sync-icon${isSyncing ? ' match-list__sync-icon--spin' : ''}`}>↻</span>
          {isSyncing ? (
            <span>Обновление…</span>
          ) : (
            <DataStatusChip
              sources={[
                { queryKey: ['matches', 'results'], cacheKey: 'results' },
                ...(user?.id
                  ? [
                      { queryKey: ['predictions', 'keys', user.id], cacheKey: `predicted_keys_${user.id}` },
                      { queryKey: ['favorites', 'overview'], cacheKey: 'favorites_overview' },
                    ]
                  : []),
              ]}
              syncState={syncState}
              fallback="Обновить"
            />
          )}
        </button>
      </div>

      {syncError && (
        <div className="match-list__sync-error">{syncError}</div>
      )}

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
              {(selectedTeam || selectedRound !== 1) && (
                <h3 className="match-list__date-header">{group.label}</h3>
              )}
              {group.days.map(day => (
                <div key={day.dateKey} className="match-list__day-group">
                  <h4 className="match-list__day-header">{day.dateLabel}</h4>
                  <div className="match-list__group-items">
                    {day.matches.map((match, idx) => (
                      <div key={match.id} className="match-card-wrap" style={{ animationDelay: `${idx * 80}ms` }}>
                        <MatchCard
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
                          hasPredicted={predictedKeys.has(`${match.round}|${match.homeTeam}|${match.awayTeam}`)}
                        />
                      </div>
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
      />
    </div>
  )
}
