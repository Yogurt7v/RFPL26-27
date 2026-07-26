import { useState, useEffect } from 'react'
import { getMatchesByRound } from '../api/matches'
import { schedule } from '../lib/schedule'
import type { Match } from '../api/matches'

export function useLiveMatches(
  selectedRound: number,
  selectedTeam: string
): Match[] {
  const [liveMatches, setLiveMatches] = useState<Match[]>([])

  useEffect(() => {
    let cancelled = false

    if (selectedTeam) {
      const teamRounds = [...new Set(
        schedule
          .filter(m => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)
          .map(m => m.round)
      )]
      Promise.all(teamRounds.map(r => getMatchesByRound(r)))
        .then(results => { if (!cancelled) setLiveMatches(results.flat()) })
        .catch(() => { if (!cancelled) setLiveMatches([]) })
    } else {
      getMatchesByRound(selectedRound)
        .then(data => { if (!cancelled) setLiveMatches(data) })
        .catch(() => { if (!cancelled) setLiveMatches([]) })
    }

    return () => { cancelled = true }
  }, [selectedRound, selectedTeam])

  return liveMatches
}
