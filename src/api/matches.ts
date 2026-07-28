import { supabase } from './supabase'

export interface Match {
  id: string
  round: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  stadium?: string
}

function dbMatchToMatch(row: Record<string, unknown>): Match {
  const date = row.match_date as string || ''
  const [datePart, timePart] = date.includes('T')
    ? date.split('T')
    : [date.slice(0, 10), date.slice(11, 16)]

  return {
    id: String(row.id as number),
    round: row.round as number,
    homeTeam: row.home_team as string,
    awayTeam: row.away_team as string,
    homeScore: (row.home_score as number) ?? null,
    awayScore: (row.away_score as number) ?? null,
    date: datePart,
    time: timePart || '',
    status: (row.status as Match['status']) || 'SCHEDULED',
    stadium: row.stadium_name as string | undefined,
  }
}

export async function getMatchesByRound(roundNumber: number): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('round', roundNumber)

  if (error) {
    console.error('Error fetching matches by round:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(dbMatchToMatch)
}

export async function getAllMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')

  if (error) {
    console.error('Error fetching all matches:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(dbMatchToMatch)
}

export async function getMatchesByTeam(teamName: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)

  if (error) {
    console.error('Error fetching matches by team:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(dbMatchToMatch)
}
