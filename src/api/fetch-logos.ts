import { config } from 'dotenv'
import { teams } from '../lib/teams'

config()

async function fetchLargeLogo(soccer365Id: number): Promise<string | null> {
  try {
    const response = await fetch(`https://soccer365.ru/clubs/${soccer365Id}/`)
    const html = await response.text()

    // Ищем URL логотипа в блоке profile_foto
    const match = html.match(/profile_foto[^>]*>\s*<img[^>]+src="([^"]+)"/)
    if (match) {
      return match[1]
    }

    // Альтернативный поиск
    const match2 = html.match(/class="profile_foto[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"/)
    if (match2) {
      return match2[1]
    }

    return null
  } catch (error) {
    console.error(`Error fetching logo for team ${soccer365Id}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching large logos from soccer365.ru...\n')

  for (const team of teams) {
    const logoUrl = await fetchLargeLogo(team.soccer365Id)
    if (logoUrl) {
      console.log(`${team.name}: ${logoUrl}`)
    } else {
      console.log(`${team.name}: NOT FOUND`)
    }
  }
}

main()
