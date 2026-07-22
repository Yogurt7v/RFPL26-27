function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

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
  try {
    const response = await fetch('/api/soccer365/competitions/13/')
    const html = stripScripts(await response.text())

    const standings: Standing[] = []

    const tableStart = html.indexOf('id="competition_table"')
    if (tableStart === -1) return []

    const tableSection = html.substring(tableStart, tableStart + 10000)

    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g
    let rowMatch
    let position = 0

    while ((rowMatch = rowRegex.exec(tableSection)) !== null) {
      const rowHtml = rowMatch[1]

      const teamMatch = rowHtml.match(/<a[^>]+href="\/clubs\/(\d+)\/"[^>]*>([^<]+)<\/a>/)
      if (!teamMatch) continue

      const teamId = parseInt(teamMatch[1])
      const teamName = teamMatch[2].trim()

      const cellRegex = /<td[^>]*class="al_c"[^>]*>([\s\S]*?)<\/td>/g
      const values: number[] = []
      let cellMatch

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const text = cellMatch[1].replace(/<[^>]*>/g, '').trim()
        const num = parseInt(text)
        if (!isNaN(num)) {
          values.push(num)
        }
      }

      if (values.length >= 8) {
        position++
        standings.push({
          position,
          teamName,
          teamId,
          played: values[0],
          won: values[1],
          drawn: values[2],
          lost: values[3],
          goalsFor: values[4],
          goalsAgainst: values[5],
          goalDifference: values[6],
          points: values[7],
        })
      }
    }

    return standings
  } catch (error) {
    console.error('Error fetching standings:', error)
    return []
  }
}
