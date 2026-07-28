import { supabase } from './supabase'

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

export async function getStandings(): Promise<Standing[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching standings:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(row => ({
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
}
