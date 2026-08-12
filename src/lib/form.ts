import type { ResultEntry } from '../api/matches'

export type FormOutcome = 'W' | 'D' | 'L'

export interface TeamFormMatch {
  score: string
  outcome: FormOutcome
  round: number
  opponent: string
  home: boolean
}

export function getTeamLastResults(
  results: ResultEntry[],
  teamName: string,
  count = 5
): TeamFormMatch[] {
  return results
    .filter(m => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
    .filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
    .sort((a, b) => b.round - a.round)
    .slice(0, count)
    .map(m => {
      const isHome = m.homeTeam === teamName
      const scored = isHome ? m.homeScore! : m.awayScore!
      const conceded = isHome ? m.awayScore! : m.homeScore!
      const outcome: FormOutcome = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D'
      return {
        score: `${scored}:${conceded}`,
        outcome,
        round: m.round,
        opponent: isHome ? m.awayTeam : m.homeTeam,
        home: isHome,
      }
    })
}
