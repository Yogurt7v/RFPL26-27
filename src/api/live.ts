function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

export interface LiveScore {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  minute: number | null
  status: 'LIVE' | 'HALFTIME' | 'FINISHED'
}

export async function getLiveScores(): Promise<LiveScore[]> {
  try {
    const response = await fetch('/api/soccer365/online/')
    const html = stripScripts(await response.text())

    const liveScores: LiveScore[] = []

    const matchRegex = /<div class="[^"]*online_match[^"]*"[\s\S]*?<\/div>/g
    let matchBlock

    while ((matchBlock = matchRegex.exec(html)) !== null) {
      const teamRegex = /<a[^>]+href="\/clubs\/\d+\/"[^>]*>([^<]+)<\/a>/g
      const teams: string[] = []
      let teamMatch
      while ((teamMatch = teamRegex.exec(matchBlock[0])) !== null) {
        teams.push(teamMatch[1].trim())
      }

      if (teams.length < 2) continue

      const scoreMatch = matchBlock[0].match(/(\d+)\s*[-:]\s*(\d+)/)
      if (!scoreMatch) continue

      const minuteMatch = matchBlock[0].match(/(\d+)'/)
      const minute = minuteMatch ? parseInt(minuteMatch[1]) : null

      let status: LiveScore['status'] = 'LIVE'
      if (matchBlock[0].includes('half') || matchBlock[0].includes('HT')) {
        status = 'HALFTIME'
      } else if (matchBlock[0].includes('fin') || matchBlock[0].includes('FT')) {
        status = 'FINISHED'
      }

      liveScores.push({
        matchId: `${teams[0]}-${teams[1]}`,
        homeTeam: teams[0],
        awayTeam: teams[1],
        homeScore: parseInt(scoreMatch[1]),
        awayScore: parseInt(scoreMatch[2]),
        minute,
        status,
      })
    }

    return liveScores
  } catch (error) {
    console.error('Error fetching live scores:', error)
    return []
  }
}
