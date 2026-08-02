import { supabase } from './supabase'
import { cacheGet, cacheSet } from './cache'

const SCHEDULE_CACHE_KEY = 'schedule'
const SCHEDULE_CACHE_TTL = 24 * 60 * 60 * 1000
const RESULTS_CACHE_KEY = 'results'
const RESULTS_CACHE_TTL = 15 * 60 * 1000

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

export interface ScheduleEntry {
  id: string
  round: number
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  stadium?: string
}

export interface ResultEntry {
  id: string
  round: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: Match['status']
}

const MOSCOW_TZ = 'Europe/Moscow'

const moscowDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MOSCOW_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const moscowTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: MOSCOW_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

function parseDateTime(matchDate: string): { date: string; time: string } {
  const value = matchDate || ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' }
  return {
    date: moscowDateFormatter.format(parsed),
    time: moscowTimeFormatter.format(parsed),
  }
}

export function getCachedSchedule(): ScheduleEntry[] | undefined {
  return cacheGet<ScheduleEntry[]>(SCHEDULE_CACHE_KEY) ?? undefined
}

export function getCachedResults(): ResultEntry[] | undefined {
  return cacheGet<ResultEntry[]>(RESULTS_CACHE_KEY) ?? undefined
}

export async function getSchedule(): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, round, home_team, away_team, match_date, stadium_name')
    .order('round', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching schedule:', error)
    return []
  }

  const schedule = (data as Record<string, unknown>[]).map(row => {
    const { date, time } = parseDateTime((row.match_date as string) || '')
    return {
      id: String(row.id as number),
      round: row.round as number,
      homeTeam: row.home_team as string,
      awayTeam: row.away_team as string,
      date,
      time,
      stadium: row.stadium_name as string | undefined,
    }
  })

  cacheSet(SCHEDULE_CACHE_KEY, schedule, SCHEDULE_CACHE_TTL)
  return schedule
}

export async function getResults(): Promise<ResultEntry[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, round, home_team, away_team, home_score, away_score, status')
    .order('round', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching results:', error)
    return []
  }

  const results = (data as Record<string, unknown>[]).map(row => ({
    id: String(row.id as number),
    round: row.round as number,
    homeTeam: row.home_team as string,
    awayTeam: row.away_team as string,
    homeScore: (row.home_score as number) ?? null,
    awayScore: (row.away_score as number) ?? null,
    status: (row.status as Match['status']) || 'SCHEDULED',
  }))

  cacheSet(RESULTS_CACHE_KEY, results, RESULTS_CACHE_TTL)
  return results
}
