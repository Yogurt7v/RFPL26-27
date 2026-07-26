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

const CACHE_KEY = 'rfpl_leaderboard'
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

interface CachedData {
  data: LeaderboardEntry[]
  timestamp: number
}

function readCache(): LeaderboardEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw) as CachedData
    if (Date.now() - timestamp < CACHE_TTL) return data
    return null
  } catch {
    return null
  }
}

function writeCache(data: LeaderboardEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function readStaleCache(): LeaderboardEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data } = JSON.parse(raw) as CachedData
    return data
  } catch {
    return null
  }
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

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // 1. Пробуем свежий cache
  const fresh = readCache()
  if (fresh) return fresh

  // 2. Запрос к Supabase
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })

  if (!error && data) {
    const mapped = mapRows(data as Record<string, unknown>[])
    writeCache(mapped)
    return mapped
  }

  console.error('Error fetching leaderboard:', error)

  // 3. Fallback на stale cache при ошибке сети
  const stale = readStaleCache()
  if (stale) return stale

  return []
}
