import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getMatchesByRound } from '../api/matches'
import { schedule } from '../lib/schedule'
import type { Match } from '../api/matches'

export function useLiveMatches(
  selectedRound: number,
  selectedTeam: string
): { matches: Match[]; loaded: boolean } {
  const teamRounds = useMemo(() => {
    if (!selectedTeam) return []
    return [...new Set(
      schedule
        .filter(m => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)
        .map(m => m.round)
    )]
  }, [selectedTeam])

  const roundQuery = useQuery({
    queryKey: ['matches', 'round', selectedRound],
    queryFn: () => getMatchesByRound(selectedRound),
    enabled: !selectedTeam,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const teamQueries = useQueries({
    queries: teamRounds.map(r => ({
      queryKey: ['matches', 'round', r],
      queryFn: () => getMatchesByRound(r),
      staleTime: 15_000,
      refetchInterval: 30_000,
    })),
    combine: results => ({
      data: results.flatMap(r => r.data ?? []),
      isFetched: results.every(r => r.isFetched),
    }),
  })

  if (selectedTeam) {
    return {
      matches: teamQueries.data,
      loaded: teamQueries.isFetched,
    }
  }

  return {
    matches: roundQuery.data ?? [],
    loaded: roundQuery.isFetched,
  }
}
