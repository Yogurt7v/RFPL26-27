import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getCachedResults,
  getCachedSchedule,
  getResults,
  getSchedule,
} from '../api/matches'
import type { Match } from '../api/matches'

export function useLiveMatches(
  selectedRound: number,
  selectedTeam: string
): { matches: Match[]; loaded: boolean; isFetching: boolean } {
  const scheduleQuery = useQuery({
    queryKey: ['matches', 'schedule'],
    queryFn: getSchedule,
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: getCachedSchedule,
  })

  const resultsQuery = useQuery({
    queryKey: ['matches', 'results'],
    queryFn: getResults,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    placeholderData: getCachedResults,
  })

  const matches = useMemo<Match[]>(() => {
    const results = resultsQuery.data ?? []

    return results
      .filter(m => selectedTeam
        ? m.homeTeam === selectedTeam || m.awayTeam === selectedTeam
        : m.round === selectedRound)
      .map(m => ({
        id: m.id,
        round: m.round,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        date: '',
        time: '',
      }))
  }, [resultsQuery.data, selectedRound, selectedTeam])

  return {
    matches,
    loaded: scheduleQuery.isFetched && resultsQuery.isFetched,
    isFetching: resultsQuery.isFetching,
  }
}
