import { supabase } from './supabase'
import { cacheGet, cacheGetStale, cacheSet, clearDataStale, markDataStale } from './cache'

const STANDINGS_CACHE_KEY = 'standings'
const STANDINGS_CACHE_TTL = 24 * 60 * 60 * 1000

export interface Standing {
  position: number
  teamName: string
  teamId: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export function getCachedStandings(): Standing[] | undefined {
  return cacheGet<Standing[]>(STANDINGS_CACHE_KEY) ?? undefined
}

export async function getStandings(): Promise<Standing[]> {
  try {
    const { data, error } = await supabase
      .from('standings')
      .select('*')
      .order('position', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    const result = (data as Record<string, unknown>[]).map(row => ({
      position: row.position as number,
      teamName: row.team_name as string,
      teamId: row.team_id as number,
      played: row.played as number,
      won: row.won as number,
      drawn: row.drawn as number,
      lost: row.lost as number,
      goalsFor: row.goals_for as number,
      goalsAgainst: row.goals_against as number,
      goalDifference: row.goal_difference as number,
      points: row.points as number,
    }))

    cacheSet(STANDINGS_CACHE_KEY, result, STANDINGS_CACHE_TTL)
    clearDataStale(STANDINGS_CACHE_KEY)
    return result
  } catch (err) {
    console.error('Error fetching standings:', err instanceof Error ? err.message : err)

    const stale = cacheGetStale<Standing[]>(STANDINGS_CACHE_KEY)
    if (stale) {
      markDataStale(STANDINGS_CACHE_KEY)
      return stale
    }

    return []
  }
}