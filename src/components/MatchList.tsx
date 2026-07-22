import { useState } from 'react'
import { MatchCard } from './MatchCard'
import { getMatchesByRound } from '../lib/schedule'
import { rounds } from '../lib/rounds'

interface MatchListProps {
  onPredict?: (matchId: string) => void
}

export function MatchList({ onPredict }: MatchListProps) {
  const [selectedRound, setSelectedRound] = useState(1)

  const matches = getMatchesByRound(selectedRound)

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
        {matches.map(match => (
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
  )
}
