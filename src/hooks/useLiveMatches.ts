import { useState, useEffect } from 'react'
import { getMatchesByRound } from '../api/matches'
import { schedule } from '../lib/schedule'
import type { Match } from '../api/matches'

const CACHE_KEY = 'rfpl_matches_round'
const CACHE_TTL_LIVE = 15_000
const CACHE_TTL_DEFAULT = 60_000

function readCache(round: number): Match[] | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${round}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as { data: Match[]; timestamp: number }
    const hasLive = entry.data.some(m => m.status === 'LIVE')
    const ttl = hasLive ? CACHE_TTL_LIVE : CACHE_TTL_DEFAULT
    if (Date.now() - entry.timestamp < ttl) return entry.data
    return null
  } catch {
    return null
  }
}

function writeCache(round: number, data: Match[]) {
  try {
    sessionStorage.setItem(`${CACHE_KEY}_${round}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // ignore
  }
}

export function useLiveMatches(
  selectedRound: number,
  selectedTeam: string
): Match[] {
  const [liveMatches, setLiveMatches] = useState<Match[]>(() => {
    if (!selectedTeam) {
      return readCache(selectedRound) ?? []
    }
    return []
  })

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
        .then(data => { if (!cancelled) {
          writeCache(selectedRound, data)
          setLiveMatches(data)
        }})
        .catch(() => { if (!cancelled) setLiveMatches([]) })
    }

    return () => { cancelled = true }
  }, [selectedRound, selectedTeam])

  return liveMatches
}
