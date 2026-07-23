import { useState, useMemo, useEffect, useCallback } from 'react'
import { MatchCard } from './MatchCard'
import { getMatchesByRound as getApiMatches } from '../api/matches'
import { getMatchesByRound as getStaticMatches, getNextMatch, getRoundByMatchId } from '../lib/schedule'
import { rounds } from '../lib/rounds'
import { formatDate, formatWeekday } from '../lib/format'
import type { Match } from '../api/matches'
import type { ScheduleMatch } from '../lib/schedule'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

interface MatchGroup {
  date: string
  label: string
  matches: Match[]
}

function scheduleToMatch(scheduleMatch: ScheduleMatch): Match {
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

export function MatchList({ onPredict }: MatchListProps) {
  const [selectedRound, setSelectedRound] = useState(1)
  const [nextMatchId, setNextMatchId] = useState<string | undefined>()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    try {
      const data = await getApiMatches(selectedRound)
      if (data.length > 0) {
        setMatches(data)
      } else {
        const staticData = getStaticMatches(selectedRound)
        setMatches(staticData.map(scheduleToMatch))
      }
    } catch (error) {
      console.error('Error fetching matches, using static data:', error)
      const staticData = getStaticMatches(selectedRound)
      setMatches(staticData.map(scheduleToMatch))
    } finally {
      setIsLoading(false)
    }
  }, [selectedRound])

  useEffect(() => {
    const next = getNextMatch()
    if (next) {
      setNextMatchId(next.id)
      const round = getRoundByMatchId(next.id)
      if (round) {
        setSelectedRound(round)
      }
    }
  }, [])

  useEffect(() => {
    fetchMatches()

    const interval = setInterval(fetchMatches, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchMatches])

  const groupedMatches = useMemo(() => {
    const groups: MatchGroup[] = []

    for (const match of matches) {
      const existingGroup = groups.find(g => g.date === match.date)
      if (existingGroup) {
        existingGroup.matches.push(match)
      } else {
        groups.push({
          date: match.date,
          label: `${formatWeekday(match.date, 'long')}, ${formatDate(match.date, 'long')}`,
          matches: [match],
        })
      }
    }

    return groups
  }, [matches])

  return (
    <div className="match-list">
      <div className="match-list__header">
        <h2>Матчи</h2>
        <select
          value={selectedRound}
          onChange={e => setSelectedRound(Number(e.target.value))}
          className="match-list__round-select"
        >
          {rounds.map(r => (
            <option key={r.number} value={r.number}>
              Тур {r.number}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="match-list__loading">Загрузка матчей...</div>
      ) : (
        <div className="match-list__grid">
          {groupedMatches.map(group => (
            <div key={group.date} className="match-list__group">
              <h3 className="match-list__date-header">{group.label}</h3>
              <div className="match-list__group-items">
                {group.matches.map(match => (
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
                    onPredict={onPredict ? () => onPredict(match.id) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
