import { supabase } from './supabase'

export interface UserPrediction {
  id: number
  matchId: number
  homeTeam: string
  awayTeam: string
  matchDate: string
  matchStatus: string
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: string | null
  goalsTeam: string | null
  goalsThreshold: number | null
  actualHomeScore: number | null
  actualAwayScore: number | null
  pointsEarned: number
}

export async function getUserPredictions(userId: string): Promise<UserPrediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select(`
      id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      outcome,
      goals_team,
      goals_threshold,
      points_earned,
      matches (
        home_team,
        away_team,
        match_date,
        status,
        home_score,
        away_score
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching predictions:', error)
    return []
  }

  return data.map((row: Record<string, unknown>) => {
    const match = row.matches as Record<string, unknown> | null
    return {
      id: row.id as number,
      matchId: row.match_id as number,
      homeTeam: (match?.home_team as string) || '',
      awayTeam: (match?.away_team as string) || '',
      matchDate: (match?.match_date as string) || '',
      matchStatus: (match?.status as string) || '',
      predictedHomeScore: row.predicted_home_score as number | null,
      predictedAwayScore: row.predicted_away_score as number | null,
      outcome: row.outcome as string | null,
      goalsTeam: row.goals_team as string | null,
      goalsThreshold: row.goals_threshold as number | null,
      actualHomeScore: (match?.home_score as number) ?? null,
      actualAwayScore: (match?.away_score as number) ?? null,
      pointsEarned: (row.points_earned as number) || 0,
    }
  })
}
