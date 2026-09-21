import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSchedule } from '../api/matches'
import { formatDate, formatWeekday } from '../lib/format'
import { teams } from '../lib/teams'
import { Spinner } from './Spinner'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

export function MatchList({ onPredict }: MatchListProps) {
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: getSchedule,
    staleTime: 5 * 60 * 1000, // 5 минут
  })

  // Автоматически определяем текущий тур
  const currentRound = useMemo(() => {
    if (matches.length === 0) return 1
    
    const now = new Date()
    const futureMatches = matches.filter(m => {
      const matchDate = new Date(`${m.date}T${m.time}:00+03:00`)
      return matchDate >= now
    })

    if (futureMatches.length === 0) {
      return Math.max(...matches.map(m => m.round))
    }

    return Math.min(...futureMatches.map(m => m.round))
  }, [matches])

  // Устанавливаем начальный тур
  const effectiveRound = selectedRound ?? currentRound

  // Фильтруем матчи
  const filteredMatches = useMemo(() => {
    let result = matches

    if (selectedTeam) {
      result = result.filter(m => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)
    } else {
      result = result.filter(m => m.round === effectiveRound)
    }

    return result
  }, [matches, effectiveRound, selectedTeam])

  // Группируем по датам
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, typeof filteredMatches>()
    
    filteredMatches.forEach(match => {
      const date = match.date
      if (!groups.has(date)) {
        groups.set(date, [])
      }
      groups.get(date)!.push(match)
    })

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredMatches])

  if (isLoading) {
    return (
      <div className="match-list">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="match-list">
      <div className="round-header">
        <div className="round-header__round">
          {selectedTeam ? selectedTeam : `Тур ${effectiveRound}`}
        </div>
        <div className="round-header__accent" />
      </div>

      <div className="match-list__filters">
        {!selectedTeam && (
          <select 
            className="match-list__select" 
            value={effectiveRound}
            onChange={e => setSelectedRound(Number(e.target.value))}
          >
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Тур {i + 1}</option>
            ))}
          </select>
        )}
        <select 
          className="match-list__select" 
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
        >
          <option value="">Все команды</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="match-list__grid">
        {groupedMatches.map(([date, dateMatches]) => (
          <div key={date} className="match-list__date-group">
            <div className="match-list__date-header">
              {formatDate(date, 'short')}, {formatWeekday(date, 'short')}
            </div>
            {dateMatches.map(match => (
              <div key={match.id} className="match-card-wrap">
                <div className="match-card" onClick={() => onPredict?.(match.id)}>
                  <div className="match-card__date">
                    {match.time}
                  </div>
                  <div className="match-card__teams">
                    <span className="match-card__team match-card__team--home">{match.homeTeam}</span>
                    <span className="match-card__vs">vs</span>
                    <span className="match-card__team match-card__team--away">{match.awayTeam}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
