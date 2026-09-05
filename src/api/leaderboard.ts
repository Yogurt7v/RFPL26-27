import { supabase } from './supabase'
import { cacheGet, cacheSet } from './cache'

const LEADERBOARD_CACHE_TTL = 24 * 60 * 60 * 1000

export interface LeaderboardEntry {
  id: string
  username: string
  totalPoints: number
  totalPredictions: number
  exactScores: number
  correctOutcomes: number
  scoredPredictions: number
}

function mapRows(rows: Record<string, unknown>[]): LeaderboardEntry[] {
  return rows.map((row) => ({
    id: row.id as string,
    username: row.username as string,
    totalPoints: row.total_points as number,
    totalPredictions: row.total_predictions as number,
    exactScores: row.exact_scores as number,
    correctOutcomes: row.correct_outcomes as number,
    scoredPredictions: row.scored_predictions as number,
  }))
}

export function getCachedLeaderboard(): LeaderboardEntry[] | undefined {
  return cacheGet<LeaderboardEntry[]>('leaderboard') ?? undefined
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  const result = mapRows(data as Record<string, unknown>[])
  cacheSet('leaderboard', result, LEADERBOARD_CACHE_TTL)
  return result
}
