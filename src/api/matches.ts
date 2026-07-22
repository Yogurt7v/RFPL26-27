import { getTeamByName } from '../lib/teams'

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
  const [day, month] = dateStr.split('.')
  return `2026-${month}-${day}`
}

function parseTeamName(name: string): string {
  const cleanName = name.trim()
  const team = getTeamByName(cleanName)
  return team ? team.name : cleanName
}

function parseMatchesFromHTML(html: string, roundNumber: number): Match[] {
  const matches: Match[] = []

  const matchBlocks = html.split(/(?=\d{2}\.\d{2},\s*\d{2}:\d{2})/)

  for (const block of matchBlocks) {
    const dateTimeMatch = block.match(/(\d{2}\.\d{2}),\s*(\d{2}:\d{2})/)
    if (!dateTimeMatch) continue

    const date = parseDate(dateTimeMatch[1])
    const time = dateTimeMatch[2]

    const teamRegex = /<a[^>]+href="\/clubs\/\d+\/"[^>]*>([^<]+)<\/a>/g
    const teams: string[] = []
    let teamMatch
    while ((teamMatch = teamRegex.exec(block)) !== null) {
      teams.push(parseTeamName(teamMatch[1]))
    }

    if (teams.length < 2) continue

    const scoreMatch = block.match(/(\d+)\s*[-:]\s*(\d+)/)
    let homeScore: number | null = null
    let awayScore: number | null = null
    let status: Match['status'] = 'SCHEDULED'

    if (scoreMatch) {
      homeScore = parseInt(scoreMatch[1])
      awayScore = parseInt(scoreMatch[2])
      status = 'FINISHED'
    } else if (block.includes('-:-') || block.includes(' - ')) {
      status = 'SCHEDULED'
    }

    matches.push({
      id: `${roundNumber}-${teams[0]}-${teams[1]}`,
      round: roundNumber,
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore,
      awayScore,
      date,
      time,
      status,
    })
  }

  return matches
}

export async function getMatchesByRound(roundNumber: number): Promise<Match[]> {
  try {
    const response = await fetch('https://soccer365.ru/competitions/13/shedule/')
    const html = await response.text()

    const roundRegex = new RegExp(`${roundNumber}-й тур([\\s\\S]*?)(?=\\d+-й тур|$)`)
    const roundMatch = html.match(roundRegex)

    if (!roundMatch) return []

    return parseMatchesFromHTML(roundMatch[1], roundNumber)
  } catch (error) {
    console.error(`Error fetching round ${roundNumber}:`, error)
    return []
  }
}

export async function getAllMatches(): Promise<Match[]> {
  const allMatches: Match[] = []

  for (let round = 1; round <= 30; round++) {
    const matches = await getMatchesByRound(round)
    allMatches.push(...matches)
  }

  return allMatches
}

export async function getMatchesByTeam(teamName: string): Promise<Match[]> {
  const allMatches = await getAllMatches()
  return allMatches.filter(
    m => m.homeTeam === teamName || m.awayTeam === teamName
  )
}
