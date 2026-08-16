import { supabase } from './supabase'
import { withRetry } from './retry'

function isNoRowsError(error: { code?: string } | null): boolean {
  return !!error && error.code === 'PGRST116'
}

function logQueryError(context: string, error: { message?: string } | null): void {
  if (!error) return
  console.error(`${context}:`, error.message)
}

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
  actualHomeScore: number | null
  actualAwayScore: number | null
  pointsEarned: number
}

export async function getPredictionForMatch(
  userId: string,
  homeTeam: string,
  awayTeam: string,
  round: number
): Promise<PredictionData | null> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('predictions')
      .select(`
        predicted_home_score,
        predicted_away_score,
        outcome,
        home_goals_threshold,
        away_goals_threshold,
        points_earned,
        matches!inner (id, home_score, away_score)
      `)
      .eq('user_id', userId)
      .eq('matches.home_team', homeTeam)
      .eq('matches.away_team', awayTeam)
      .eq('matches.round', round)
      .maybeSingle()
  )

  logQueryError('getPredictionForMatch', error)
  if (!data) return null

  const match = data.matches as Record<string, unknown> | null

  return {
    predictedHomeScore: data.predicted_home_score as number | null,
    predictedAwayScore: data.predicted_away_score as number | null,
    outcome: data.outcome as string | null,
    homeGoalsThreshold: data.home_goals_threshold as number | null,
    awayGoalsThreshold: data.away_goals_threshold as number | null,
    actualHomeScore: (match?.home_score as number) ?? null,
    actualAwayScore: (match?.away_score as number) ?? null,
    pointsEarned: (data.points_earned as number) || 0,
  }
}

export interface MatchInfo {
  id: number
  homeScore: number | null
  awayScore: number | null
}

export async function findMatchId(homeTeam: string, awayTeam: string, round: number): Promise<number | null> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('matches')
      .select('id')
      .eq('home_team', homeTeam)
      .eq('away_team', awayTeam)
      .eq('round', round)
      .single()
  )

  if (error && !isNoRowsError(error)) {
    logQueryError('findMatchId', error)
  }

  return data?.id ?? null
}

export async function getMatchInfo(homeTeam: string, awayTeam: string, round: number): Promise<MatchInfo | null> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('matches')
      .select('id, home_score, away_score')
      .eq('home_team', homeTeam)
      .eq('away_team', awayTeam)
      .eq('round', round)
      .single()
  )

  if (error && !isNoRowsError(error)) {
    logQueryError('getMatchInfo', error)
  }

  if (!data) return null

  return {
    id: data.id as number,
    homeScore: (data.home_score as number) ?? null,
    awayScore: (data.away_score as number) ?? null,
  }
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

  const { data: match, error: statusError } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single()

  if (statusError && !isNoRowsError(statusError)) {
    logQueryError('savePrediction:status', statusError)
  }

  if (match && match.status !== 'SCHEDULED') {
    console.error('Prediction not saved: match is not open for predictions:', homeTeam, 'vs', awayTeam, 'round', round, 'status:', match.status)
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

export async function deletePrediction(
  userId: string,
  homeTeam: string,
  awayTeam: string,
  round: number
): Promise<boolean> {
  const matchId = await findMatchId(homeTeam, awayTeam, round)
  if (matchId == null) {
    console.error('Match not found in Supabase:', homeTeam, 'vs', awayTeam, 'round', round)
    return false
  }

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)

  if (error) {
    console.error('Error deleting prediction:', error)
    return false
  }

  return true
}

export async function getUserPredictions(userId: string): Promise<UserPrediction[]> {
  const { data, error } = await withRetry(() =>
    supabase
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
  )

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
  pointsEarned: number
}

export interface MatchPredictionsInfo {
  count: number
  usernames: string[]
  predictions: OtherPrediction[]
}

export async function getUserPredictedMatchKeys(userId: string): Promise<Set<string>> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('predictions')
      .select('matches!inner(round, home_team, away_team)')
      .eq('user_id', userId)
  )

  if (error || !data) {
    logQueryError('getUserPredictedMatchKeys', error)
    return new Set()
  }
  return new Set(
    (data as any[]).map(d => `${d.matches.round}|${d.matches.home_team}|${d.matches.away_team}`)
  )
}

export async function getMatchOtherPredictions(
  matchId: number,
  currentUserId: string
): Promise<MatchPredictionsInfo> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('predictions')
      .select(`
        predicted_home_score,
        predicted_away_score,
        outcome,
        home_goals_threshold,
        away_goals_threshold,
        points_earned,
        users!inner (username)
      `)
      .eq('match_id', matchId)
      .neq('user_id', currentUserId)
  )

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
      pointsEarned: (row.points_earned as number) || 0,
    }
  })

  return {
    count: predictions.length,
    usernames: predictions.map(p => p.username),
    predictions,
  }
}
