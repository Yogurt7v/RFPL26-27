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
  homeGoalsThreshold: number | null
  awayGoalsThreshold: number | null
  actualHomeScore: number | null
  actualAwayScore: number | null
  pointsEarned: number
}

export interface PredictionData {
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: string | null
  homeGoalsThreshold: number | null
  awayGoalsThreshold: number | null
}

export async function getPredictionForMatch(
  userId: string,
  homeTeam: string,
  awayTeam: string,
  round: number
): Promise<PredictionData | null> {
  const { data } = await supabase
    .from('predictions')
    .select(`
      predicted_home_score,
      predicted_away_score,
      outcome,
      home_goals_threshold,
      away_goals_threshold,
      matches!inner (id)
    `)
    .eq('user_id', userId)
    .eq('matches.home_team', homeTeam)
    .eq('matches.away_team', awayTeam)
    .eq('matches.round', round)
    .maybeSingle()

  if (!data) return null

  return {
    predictedHomeScore: data.predicted_home_score as number | null,
    predictedAwayScore: data.predicted_away_score as number | null,
    outcome: data.outcome as string | null,
    homeGoalsThreshold: data.home_goals_threshold as number | null,
    awayGoalsThreshold: data.away_goals_threshold as number | null,
  }
}

export async function findMatchId(homeTeam: string, awayTeam: string, round: number): Promise<number | null> {
  const { data } = await supabase
    .from('matches')
    .select('id')
    .eq('home_team', homeTeam)
    .eq('away_team', awayTeam)
    .eq('round', round)
    .single()

  return data?.id ?? null
}

export async function savePrediction(
  userId: string,
  homeTeam: string,
  awayTeam: string,
  round: number,
  prediction: PredictionData
): Promise<boolean> {
  const matchId = await findMatchId(homeTeam, awayTeam, round)
  if (matchId == null) {
    console.error('Match not found in Supabase:', homeTeam, 'vs', awayTeam, 'round', round)
    return false
  }

  const { error } = await supabase
    .from('predictions')
    .upsert({
      user_id: userId,
      match_id: matchId,
      predicted_home_score: prediction.predictedHomeScore,
      predicted_away_score: prediction.predictedAwayScore,
      outcome: prediction.outcome,
      home_goals_threshold: prediction.homeGoalsThreshold,
      away_goals_threshold: prediction.awayGoalsThreshold,
    }, { onConflict: 'user_id,match_id' })

  if (error) {
    console.error('Error saving prediction:', error)
    return false
  }

  return true
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
      home_goals_threshold,
      away_goals_threshold,
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
      homeGoalsThreshold: row.home_goals_threshold as number | null,
      awayGoalsThreshold: row.away_goals_threshold as number | null,
      actualHomeScore: (match?.home_score as number) ?? null,
      actualAwayScore: (match?.away_score as number) ?? null,
      pointsEarned: (row.points_earned as number) || 0,
    }
  })
}

export interface OtherPrediction {
  username: string
  predictedHomeScore: number | null
  predictedAwayScore: number | null
  outcome: string | null
  homeGoalsThreshold: number | null
  awayGoalsThreshold: number | null
}

export interface MatchPredictionsInfo {
  count: number
  usernames: string[]
  predictions: OtherPrediction[]
}

export async function getMatchOtherPredictions(
  matchId: number,
  currentUserId: string
): Promise<MatchPredictionsInfo> {
  const { data, error } = await supabase
    .from('predictions')
    .select(`
      predicted_home_score,
      predicted_away_score,
      outcome,
      home_goals_threshold,
      away_goals_threshold,
      users!inner (username)
    `)
    .eq('match_id', matchId)
    .neq('user_id', currentUserId)

  if (error || !data) {
    return { count: 0, usernames: [], predictions: [] }
  }

  const predictions: OtherPrediction[] = data.map((row: Record<string, unknown>) => {
    const u = row.users as Record<string, unknown> | null
    return {
      username: (u?.username as string) || 'Аноним',
      predictedHomeScore: row.predicted_home_score as number | null,
      predictedAwayScore: row.predicted_away_score as number | null,
      outcome: row.outcome as string | null,
      homeGoalsThreshold: row.home_goals_threshold as number | null,
      awayGoalsThreshold: row.away_goals_threshold as number | null,
    }
  })

  return {
    count: predictions.length,
    usernames: predictions.map(p => p.username),
    predictions,
  }
}
