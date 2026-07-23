import { useState, useMemo, useEffect } from 'react'
import { MatchCard } from './MatchCard'
import { schedule, getNextMatch, getRoundByMatchId } from '../lib/schedule'
import { rounds } from '../lib/rounds'
import { teams } from '../lib/teams'
import { formatDate, formatWeekday } from '../lib/format'
import type { Match } from '../api/matches'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

interface DayGroup {
  dateKey: string
  dateLabel: string
  matches: Match[]
}

interface RoundGroup {
  label: string
  days: DayGroup[]
}

function scheduleToMatch(scheduleMatch: { id: string; round: number; homeTeam: string; awayTeam: string; date: string; time: string }): Match {
  return {
    id: scheduleMatch.id,
    round: scheduleMatch.round,
    homeTeam: scheduleMatch.homeTeam,
    awayTeam: scheduleMatch.awayTeam,
    homeScore: null,
    awayScore: null,
    date: scheduleMatch.date,
    time: scheduleMatch.time,
    status: 'SCHEDULED',
  }
}

function getTeamMatches(teamName: string): Match[] {
  return schedule
    .filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
    .map(scheduleToMatch)
}

function findNextMatchForTeam(teamName: string): string | undefined {
  const now = new Date()
  const teamScheduleMatches = schedule.filter(m => m.homeTeam === teamName || m.awayTeam === teamName)

  for (const match of teamScheduleMatches) {
    const matchDate = new Date(`${match.date}T${match.time}:00`)
    if (matchDate > now) {
      return match.id
    }
  }

  return undefined
}

export function MatchList({ onPredict }: MatchListProps) {
  const [selectedRound, setSelectedRound] = useState(1)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [nextMatchId, setNextMatchId] = useState<string | undefined>()
  const [isLoading] = useState(false)

  useEffect(() => {
    if (!selectedTeam) {
      const next = getNextMatch()
      if (next) {
        setNextMatchId(next.id)
        const round = getRoundByMatchId(next.id)
        if (round) {
          setSelectedRound(round)
        }
      }
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeam) {
      const nextForTeam = findNextMatchForTeam(selectedTeam)
      setNextMatchId(nextForTeam)
    }
  }, [selectedTeam])

  const allMatches = useMemo(() => {
    if (selectedTeam) {
      return getTeamMatches(selectedTeam)
    }
    return schedule
      .filter(m => m.round === selectedRound)
      .map(scheduleToMatch)
  }, [selectedTeam, selectedRound])

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

  return (
    <div className="match-list">
      <div className="match-list__header">
        <h2>Матчи</h2>
        <div className="match-list__filters">
          {!selectedTeam && (
            <select
              value={selectedRound}
              onChange={e => setSelectedRound(Number(e.target.value))}
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
            onChange={e => setSelectedTeam(e.target.value)}
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

      {isLoading ? (
        <div className="match-list__loading">Загрузка матчей...</div>
      ) : (
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
                          onClick={onPredict ? () => onPredict(match.id) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
