import { useState, useMemo } from 'react'
import { MatchCard } from './MatchCard'
import { getMatchesByRound } from '../lib/schedule'
import { rounds } from '../lib/rounds'
import { formatDate, formatWeekday } from '../lib/format'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

interface MatchGroup {
  date: string
  label: string
  matches: ReturnType<typeof getMatchesByRound>
}

export function MatchList({ onPredict }: MatchListProps) {
  const [selectedRound, setSelectedRound] = useState(1)

  const matches = getMatchesByRound(selectedRound)

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

      <div className="match-list__grid">
        {groupedMatches.map(group => (
          <div key={group.date} className="match-list__group">
            <h3 className="match-list__date-header">{group.label}</h3>
            <div className="match-list__group-items">
              {group.matches.map(match => (
                <MatchCard
                  key={match.id}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  date={match.date}
                  time={match.time}
                  status="SCHEDULED"
                  onPredict={onPredict ? () => onPredict(match.id) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
