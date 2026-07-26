import { getTeamBySoccer365Id } from '../lib/teams'

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

    const gameBlocks = html.split(/<div class="game_block /)

    for (let i = 1; i < gameBlocks.length; i++) {
      const block = '<div class="game_block ' + gameBlocks[i]

      const htIdMatch = block.match(/dt-ht="(\d+)"/)
      const atIdMatch = block.match(/dt-at="(\d+)"/)
      if (!htIdMatch || !atIdMatch) continue

      const home = getTeamBySoccer365Id(parseInt(htIdMatch[1]))
      const away = getTeamBySoccer365Id(parseInt(atIdMatch[1]))
      if (!home || !away) continue

      const glsMatches = [...block.matchAll(/<div class="gls">([\s\S]*?)<\/div>/g)]
      if (glsMatches.length < 2) continue

      const homeScoreText = glsMatches[0][1].trim()
      const awayScoreText = glsMatches[1][1].trim()
      if (homeScoreText === '-' || awayScoreText === '-') continue

      const hs = parseInt(homeScoreText)
      const as = parseInt(awayScoreText)
      if (isNaN(hs) || isNaN(as)) continue

      const minuteMatch = block.match(/(\d+)'/)
      const minute = minuteMatch ? parseInt(minuteMatch[1]) : null

      let status: LiveScore['status'] = 'LIVE'
      if (block.includes('half') || block.includes('HT')) {
        status = 'HALFTIME'
      } else if (block.includes('fin') || block.includes('FT')) {
        status = 'FINISHED'
      }

      liveScores.push({
        matchId: `${home.name}-${away.name}`,
        homeTeam: home.name,
        awayTeam: away.name,
        homeScore: hs,
        awayScore: as,
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
