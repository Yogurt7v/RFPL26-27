import { supabase } from './supabase'

export interface LeaderboardEntry {
  id: string
  username: string
  totalPoints: number
  totalPredictions: number
  exactScores: number
  correctOutcomes: number
  scoredPredictions: number
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

  return data.map((row) => ({
    id: row.id,
    username: row.username,
    totalPoints: row.total_points,
    totalPredictions: row.total_predictions,
    exactScores: row.exact_scores,
    correctOutcomes: row.correct_outcomes,
    scoredPredictions: row.scored_predictions,
  }))
}
