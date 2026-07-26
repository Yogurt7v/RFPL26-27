import { getTeamBySoccer365Id } from '../lib/teams'

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

// ── Soccer365 HTML parsing ──────────────────────────────────────────

function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

function parseDate(dateStr: string): string {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const year = today.getFullYear()

  if (!dateStr.includes('.')) {
    return `${year}-${month}-${day}`
  }

  const [d, m] = dateStr.split('.')
  const monthNum = parseInt(m)
  const yearNum = monthNum >= 7 && monthNum <= 12 ? 2026 : 2027
  return `${yearNum}-${m}-${d}`
}

function parseGameBlock(block: string, roundNumber: number): Match | null {
  const htIdMatch = block.match(/dt-ht="(\d+)"/)
  const atIdMatch = block.match(/dt-at="(\d+)"/)
  if (!htIdMatch || !atIdMatch) return null

  const home = getTeamBySoccer365Id(parseInt(htIdMatch[1]))
  const away = getTeamBySoccer365Id(parseInt(atIdMatch[1]))
  if (!home || !away) return null

  const stadiumMatch = block.match(/"name":"([^"]+)"/)
  const stadium = stadiumMatch?.[1]

  const statusMatch = block.match(
    /<div class="status"><span[^>]*>([\s\S]*?)<\/span><\/div>/
  )
  if (!statusMatch) return null

  const statusText = statusMatch[1].trim()

  let date: string
  let time: string

  if (statusText.includes(',')) {
    const [datePart, timePart] = statusText.split(',').map(s => s.trim())
    date = parseDate(datePart)
    time = timePart
  } else {
    date = parseDate('')
    time = statusText
  }

  const glsMatches = [...block.matchAll(/<div class="gls">([\s\S]*?)<\/div>/g)]
  if (glsMatches.length < 2) return null

  const homeScoreText = glsMatches[0][1].trim()
  const awayScoreText = glsMatches[1][1].trim()

  let homeScore: number | null = null
  let awayScore: number | null = null
  let status: Match['status'] = 'SCHEDULED'

  if (homeScoreText !== '-' && awayScoreText !== '-') {
    const hs = parseInt(homeScoreText)
    const as = parseInt(awayScoreText)
    if (!isNaN(hs) && !isNaN(as)) {
      homeScore = hs
      awayScore = as
      status = 'FINISHED'
    }
  }

  return {
    id: `${roundNumber}-${home.name}-${away.name}`,
    round: roundNumber,
    homeTeam: home.name,
    awayTeam: away.name,
    homeScore,
    awayScore,
    date,
    time,
    status,
    stadium,
  }
}

function parseMatchesFromHTML(html: string): Match[] {
  const matches: Match[] = []
  const sections = html.split(/(?=<div class="cmp_stg_ttl">)/)

  for (const section of sections) {
    const roundMatch = section.match(
      /<div class="cmp_stg_ttl">(\d+)-й тур<\/div>/
    )
    if (!roundMatch) continue

    const roundNumber = parseInt(roundMatch[1])
    const gameBlocks = section.split(/<div class="game_block /)

    for (let i = 1; i < gameBlocks.length; i++) {
      const match = parseGameBlock(
        '<div class="game_block ' + gameBlocks[i],
        roundNumber
      )
      if (match) matches.push(match)
    }
  }

  return matches
}

// ── Soccer365 fetch + cache ─────────────────────────────────────────

const RESULTS_CACHE_KEY = 'rfpl_results'
const SCHEDULE_CACHE_KEY = 'rfpl_schedule'
const CACHE_TTL = 5 * 60 * 1000

interface CachedMatches {
  data: Match[]
  timestamp: number
}

function readCache(key: string): Match[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw) as CachedMatches
    if (Date.now() - timestamp < CACHE_TTL) return data
    return null
  } catch {
    return null
  }
}

function readStaleCache(key: string): Match[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data } = JSON.parse(raw) as CachedMatches
    return data
  } catch {
    return null
  }
}

function writeCache(key: string, data: Match[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable
  }
}

let memResults: Match[] | null = null
let memSchedule: Match[] | null = null

async function fetchResults(): Promise<Match[]> {
  if (memResults) return memResults

  const fresh = readCache(RESULTS_CACHE_KEY)
  if (fresh) {
    memResults = fresh
    return fresh
  }

  try {
    const response = await fetch('/api/soccer365/competitions/13/results/')
    const html = stripScripts(await response.text())
    const data = parseMatchesFromHTML(html)
    memResults = data
    writeCache(RESULTS_CACHE_KEY, data)
    return data
  } catch (error) {
    console.error('Error fetching results:', error)
    const stale = readStaleCache(RESULTS_CACHE_KEY)
    if (stale) {
      memResults = stale
      return stale
    }
    return []
  }
}

async function fetchSchedule(): Promise<Match[]> {
  if (memSchedule) return memSchedule

  const fresh = readCache(SCHEDULE_CACHE_KEY)
  if (fresh) {
    memSchedule = fresh
    return fresh
  }

  try {
    const response = await fetch('/api/soccer365/competitions/13/shedule/')
    const html = stripScripts(await response.text())
    const data = parseMatchesFromHTML(html)
    memSchedule = data
    writeCache(SCHEDULE_CACHE_KEY, data)
    return data
  } catch (error) {
    console.error('Error fetching schedule:', error)
    const stale = readStaleCache(SCHEDULE_CACHE_KEY)
    if (stale) {
      memSchedule = stale
      return stale
    }
    return []
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function preloadAllMatches(): void {
  fetchResults()
  fetchSchedule()
}

export async function getMatchesByRound(roundNumber: number): Promise<Match[]> {
  const [results, schedule] = await Promise.all([fetchResults(), fetchSchedule()])

  const merged = new Map<string, Match>()

  for (const m of schedule.filter(m => m.round === roundNumber)) {
    merged.set(`${m.homeTeam}-${m.awayTeam}`, m)
  }

  for (const m of results.filter(m => m.round === roundNumber)) {
    merged.set(`${m.homeTeam}-${m.awayTeam}`, m)
  }

  return Array.from(merged.values())
}

export async function getAllMatches(): Promise<Match[]> {
  const [results, schedule] = await Promise.all([fetchResults(), fetchSchedule()])

  const merged = new Map<string, Match>()

  for (const m of schedule) {
    merged.set(`${m.homeTeam}-${m.awayTeam}`, m)
  }

  for (const m of results) {
    merged.set(`${m.homeTeam}-${m.awayTeam}`, m)
  }

  return Array.from(merged.values())
}

export async function getMatchesByTeam(teamName: string): Promise<Match[]> {
  const allMatches = await getAllMatches()
  return allMatches.filter(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  )
}
