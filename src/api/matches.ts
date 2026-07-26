import { getTeamBySoccer365Id } from '../lib/teams'

function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

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

  const homeTeam365Id = parseInt(htIdMatch[1])
  const awayTeam365Id = parseInt(atIdMatch[1])

  const home = getTeamBySoccer365Id(homeTeam365Id)
  const away = getTeamBySoccer365Id(awayTeam365Id)
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

let cachedResults: Match[] | null = null
let cachedSchedule: Match[] | null = null

async function fetchResults(): Promise<Match[]> {
  if (cachedResults) return cachedResults
  try {
    const response = await fetch('/api/soccer365/competitions/13/results/')
    const html = stripScripts(await response.text())
    cachedResults = parseMatchesFromHTML(html)
    return cachedResults
  } catch (error) {
    console.error('Error fetching results:', error)
    return []
  }
}

async function fetchSchedule(): Promise<Match[]> {
  if (cachedSchedule) return cachedSchedule
  try {
    const response = await fetch('/api/soccer365/competitions/13/shedule/')
    const html = stripScripts(await response.text())
    cachedSchedule = parseMatchesFromHTML(html)
    return cachedSchedule
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return []
  }
}

export async function getMatchesByRound(roundNumber: number): Promise<Match[]> {
  const [results, schedule] = await Promise.all([fetchResults(), fetchSchedule()])

  const roundResults = results.filter(m => m.round === roundNumber)
  const roundSchedule = schedule.filter(m => m.round === roundNumber)

  const merged = new Map<string, Match>()

  for (const m of roundSchedule) {
    merged.set(`${m.homeTeam}-${m.awayTeam}`, m)
  }

  for (const m of roundResults) {
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
