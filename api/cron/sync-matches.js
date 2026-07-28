import { createClient } from '@supabase/supabase-js'

// ── Team mapping (soccer365Id → our name) ─────────────────────────────

const TEAM_MAP = {
  15567: 'Акрон',
  161: 'Ахмат',
  10: 'Балтика',
  10577: 'Динамо Махачкала',
  277: 'Динамо Москва',
  52: 'Зенит',
  315: 'Краснодар',
  69: 'Крылья Советов',
  85: 'Локомотив Москва',
  6900: 'Оренбург',
  15624: 'Родина',
  133: 'Ростов',
  134: 'Рубин',
  151: 'Спартак Москва',
  7402: 'Факел',
  182: 'ЦСКА Москва',
}

function teamName(id) {
  return TEAM_MAP[id] || null
}

// ── HTML helpers ───────────────────────────────────────────────────────

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

function parseDate(dateStr) {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const year = today.getFullYear()

  if (!dateStr || !dateStr.includes('.')) {
    return `${year}-${month}-${day}`
  }

  const [d, m] = dateStr.split('.')
  const monthNum = parseInt(m)
  const yearNum = monthNum >= 7 && monthNum <= 12 ? 2026 : 2027
  return `${yearNum}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ── Parsers (ported from src/api/matches.ts, live.ts, standings.ts) ──

function parseGameBlock(block, roundNumber) {
  const htIdMatch = block.match(/dt-ht="(\d+)"/)
  const atIdMatch = block.match(/dt-at="(\d+)"/)
  if (!htIdMatch || !atIdMatch) return null

  const home = teamName(parseInt(htIdMatch[1]))
  const away = teamName(parseInt(atIdMatch[1]))
  if (!home || !away) return null

  const statusMatch = block.match(
    /<div class="status"><span[^>]*>([\s\S]*?)<\/span><\/div>/
  )
  if (!statusMatch) return null

  const statusText = statusMatch[1].trim()

  let date, time

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

  let homeScore = null
  let awayScore = null
  let status = 'SCHEDULED'

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
    home_team: home,
    away_team: away,
    match_date: `${date}T${time}:00+03:00`,
    status,
    home_score: homeScore ?? 0,
    away_score: awayScore ?? 0,
    round: roundNumber,
  }
}

function parseMatchesFromHTML(html) {
  const matches = []
  const sections = html.split(/(?=<div class="cmp_stg_ttl">)/)

  for (const section of sections) {
    const roundMatch = section.match(
      /<div class="cmp_stg_ttl">(\d+)-й тур<\/div>/
    )
    if (!roundMatch) continue

    const roundNumber = parseInt(roundMatch[1])
    const gameBlocks = section.split(/<div class="game_block /)

    for (let i = 1; i < gameBlocks.length; i++) {
      const m = parseGameBlock(
        '<div class="game_block ' + gameBlocks[i],
        roundNumber
      )
      if (m) matches.push(m)
    }
  }

  return matches
}

function parseLiveScoresFromHTML(html) {
  const scores = []
  const gameBlocks = html.split(/<div class="game_block /)

  for (let i = 1; i < gameBlocks.length; i++) {
    const block = '<div class="game_block ' + gameBlocks[i]

    const htIdMatch = block.match(/dt-ht="(\d+)"/)
    const atIdMatch = block.match(/dt-at="(\d+)"/)
    if (!htIdMatch || !atIdMatch) continue

    const home = teamName(parseInt(htIdMatch[1]))
    const away = teamName(parseInt(atIdMatch[1]))
    if (!home || !away) continue

    const glsMatches = [...block.matchAll(/<div class="gls">([\s\S]*?)<\/div>/g)]
    if (glsMatches.length < 2) continue

    const homeScoreText = glsMatches[0][1].trim()
    const awayScoreText = glsMatches[1][1].trim()
    if (homeScoreText === '-' || awayScoreText === '-') continue

    const hs = parseInt(homeScoreText)
    const as = parseInt(awayScoreText)
    if (isNaN(hs) || isNaN(as)) continue

    let status = 'LIVE'
    if (block.includes('half') || block.includes('HT')) {
      status = 'HALFTIME'
    } else if (block.includes('fin') || block.includes('FT')) {
      status = 'FINISHED'
    }

    scores.push({
      home_team: home,
      away_team: away,
      home_score: hs,
      away_score: as,
      status,
    })
  }

  return scores
}

function parseStandingsFromHTML(html) {
  const standings = []
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

    const cellRegex = /<td[^>]*class="al_c"[^>]*>([\s\S]*?)<\/td>/g
    const values = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = cellMatch[1].replace(/<[^>]*>/g, '').trim()
      const num = parseInt(text)
      if (!isNaN(num)) values.push(num)
    }

    if (values.length >= 8) {
      position++
      standings.push({
        team_id: teamId,
        team_name: teamMatch[2].trim(),
        position,
        played: values[0],
        won: values[1],
        drawn: values[2],
        lost: values[3],
        goals_for: values[4],
        goals_against: values[5],
        goal_difference: values[6],
        points: values[7],
      })
    }
  }

  // Normalize team names using our mapping
  const idToName = Object.fromEntries(
    Object.entries(TEAM_MAP).map(([sid, name]) => [parseInt(sid), name])
  )
  for (const s of standings) {
    if (idToName[s.team_id]) {
      s.team_name = idToName[s.team_id]
    }
  }

  return standings
}

// ── Fetch helpers ──────────────────────────────────────────────────────

async function fetchHtml(path) {
  const url = `https://soccer365.ru${path}`
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Referer': 'https://soccer365.ru/',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`)
  }

  return stripScripts(await response.text())
}

// ── Main handler ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only allow GET (for cron trigger)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    return res.status(500).json({ error: 'Missing Supabase credentials' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const log = []
  const errors = []

  try {
    // ── 1. Fetch schedule (upcoming matches) ──
    log.push('Fetching schedule...')
    const scheduleHtml = await fetchHtml('/competitions/13/shedule/')
    const scheduleMatches = parseMatchesFromHTML(scheduleHtml)
    log.push(`Parsed ${scheduleMatches.length} scheduled matches`)

    // ── 2. Fetch results (finished matches) ──
    log.push('Fetching results...')
    const resultsHtml = await fetchHtml('/competitions/13/results/')
    const resultMatches = parseMatchesFromHTML(resultsHtml)
    log.push(`Parsed ${resultMatches.length} finished matches`)

    // ── 3. Fetch live scores ──
    log.push('Fetching live scores...')
    const liveHtml = await fetchHtml('/online/')
    const liveScores = parseLiveScoresFromHTML(liveHtml)
    log.push(`Parsed ${liveScores.length} live matches`)

    // ── 4. Fetch standings ──
    log.push('Fetching standings...')
    const standingsHtml = await fetchHtml('/competitions/13/')
    const standings = parseStandingsFromHTML(standingsHtml)
    log.push(`Parsed ${standings.length} standings entries`)

    // ── 5. Merge matches ──
    //   - Schedule has SCHEDULED matches (with date/time, no scores)
    //   - Results has FINISHED matches (with scores)
    //   - LiveScores has LIVE matches (overrides scores)

    const matchMap = new Map()

    // Schedule first (lowest priority)
    for (const m of scheduleMatches) {
      const key = `${m.round}|${m.home_team}|${m.away_team}`
      matchMap.set(key, m)
    }

    // Results override
    for (const m of resultMatches) {
      const key = `${m.round}|${m.home_team}|${m.away_team}`
      if (matchMap.has(key)) {
        const existing = matchMap.get(key)
        // Keep the original date/time from schedule, but apply scores
        matchMap.set(key, {
          ...existing,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
        })
      } else {
        matchMap.set(key, m)
      }
    }

    // Live scores override (highest priority)
    for (const live of liveScores) {
      // Live matches might be in any round — find by team names
      for (const [key, m] of matchMap) {
        if (m.home_team === live.home_team && m.away_team === live.away_team) {
          matchMap.set(key, {
            ...m,
            home_score: live.home_score,
            away_score: live.away_score,
            status: live.status === 'FINISHED' ? 'FINISHED' : 'LIVE',
          })
          break
        }
      }
      // If no match in our map, add it with unknown round
      if (!Array.from(matchMap.values()).some(
        m => m.home_team === live.home_team && m.away_team === live.away_team
      )) {
        matchMap.set(`live|${live.home_team}|${live.away_team}`, {
          home_team: live.home_team,
          away_team: live.away_team,
          match_date: new Date().toISOString(),
          status: live.status === 'FINISHED' ? 'FINISHED' : 'LIVE',
          home_score: live.home_score,
          away_score: live.away_score,
          round: 0,
        })
      }
    }

    const allMatches = Array.from(matchMap.values())
    log.push(`Total unique matches to upsert: ${allMatches.length}`)

    // ── 6. Upsert matches to Supabase ──
    const { error: matchError } = await supabase
      .from('matches')
      .upsert(allMatches, {
        onConflict: 'round, home_team, away_team',
        ignoreDuplicates: false,
      })

    if (matchError) {
      errors.push(`Match upsert error: ${matchError.message}`)
    } else {
      log.push(`Upserted ${allMatches.length} matches successfully`)
    }

    // ── 7. Upsert standings ──
    if (standings.length > 0) {
      const { error: standingError } = await supabase
        .from('standings')
        .upsert(standings, {
          onConflict: 'team_id',
          ignoreDuplicates: false,
        })

      if (standingError) {
        errors.push(`Standings upsert error: ${standingError.message}`)
      } else {
        log.push(`Upserted ${standings.length} standings entries successfully`)
      }
    }

    // ── 8. Response ──
    const status = errors.length === 0 ? 200 : 207
    return res.status(status).json({
      status: errors.length === 0 ? 'ok' : 'partial',
      log,
      errors,
      matches: allMatches.length,
      standings: standings.length,
    })

  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({
      status: 'error',
      log,
      errors: [...errors, error.message],
    })
  }
}
