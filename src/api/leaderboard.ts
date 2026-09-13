import { supabase } from './supabase'
import { cacheGet, cacheGetStale, cacheSet, clearDataStale, markDataStale } from './cache'

const LEADERBOARD_CACHE_KEY = 'leaderboard'
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
  return cacheGet<LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY) ?? undefined
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    const result = mapRows(data as Record<string, unknown>[])
    cacheSet(LEADERBOARD_CACHE_KEY, result, LEADERBOARD_CACHE_TTL)
    clearDataStale(LEADERBOARD_CACHE_KEY)
    return result
  } catch (err) {
    console.error('Error fetching leaderboard:', err instanceof Error ? err.message : err)

    const stale = cacheGetStale<LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY)
    if (stale) {
      markDataStale(LEADERBOARD_CACHE_KEY)
      return stale
    }

    return []
  }
}
