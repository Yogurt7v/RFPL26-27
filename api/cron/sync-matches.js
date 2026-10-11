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

// Москва = UTC+3 круглый год (переход на летнее время отменён в 2014),
// поэтому календарные даты берём из сдвинутого UTC. Локальные часы сервера
// на Vercel — это UTC, и в первые 3 часа после полуночи МСК «сегодня» там
// ещё вчера: матч стартующего дня уезжал бы на сутки назад.
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000
// Сезон стартует в июле: июль–декабрь относятся к году старта,
// январь–июнь — к следующему году.
const SEASON_START_MONTH = 7

function parseDate(dateStr) {
  const moscowNow = new Date(Date.now() + MOSCOW_OFFSET_MS)
  const day = moscowNow.getUTCDate().toString().padStart(2, '0')
  const month = (moscowNow.getUTCMonth() + 1).toString().padStart(2, '0')

  if (!dateStr || !dateStr.includes('.')) {
    return `${moscowNow.getUTCFullYear()}-${month}-${day}`
  }

  const [d, m] = dateStr.split('.')
  const monthNum = parseInt(m)
  // Год старта сезона выводим из московской даты, а не хардкодим пару
  // 2026/2027: та же формула остаётся верной на сезоне 2027/28 без правок.
  const seasonStartYear =
    moscowNow.getUTCMonth() + 1 < SEASON_START_MONTH
      ? moscowNow.getUTCFullYear() - 1
      : moscowNow.getUTCFullYear()
  const yearNum = monthNum >= SEASON_START_MONTH ? seasonStartYear : seasonStartYear + 1
  return `${yearNum}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ── Parsers (ported from src/api/matches.ts, live.ts, standings.ts) ──

function parseGameBlock(block, roundNumber, deltaMs = null) {
  const htIdMatch = block.match(/dt-ht="(\d+)"/)
  const atIdMatch = block.match(/dt-at="(\d+)"/)
  if (!htIdMatch || !atIdMatch) return null

  const home = teamName(parseInt(htIdMatch[1]))
  const away = teamName(parseInt(atIdMatch[1]))
  if (!home || !away) return null

  // Абсолютное время из ld+json (со смещением +03:00), не зависит от
  // таймзоны, в которой soccer365 рендерит страницу запросившему IP.
  const startDateMatch = block.match(/"startDate":"([^"]+)"/)
  const startDate = startDateMatch ? startDateMatch[1] : null

  const statusMatch = block.match(
    /<div class="status"><span[^>]*>([\s\S]*?)<\/span><\/div>/
  )
  // Без ld+json и без статуса блок не разобрать
  if (!startDate && !statusMatch) return null

  const statusText = statusMatch ? statusMatch[1].trim() : ''

  let date, time

  if (statusText.includes(',')) {
    const [datePart, timePart] = statusText.split(',').map(s => s.trim())
    date = parseDate(datePart)
    time = TIME_RE.test(timePart) ? timePart : '00:00'
  } else if (TIME_RE.test(statusText)) {
    date = parseDate('')
    time = statusText
  } else {
    date = parseDate('')
    time = '00:00'
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

  // Время матча пишем только когда оно достоверно: либо абсолютное из
  // ld+json startDate, либо statusText, откалиброванный по чужому блоку.
  // Без калибровки (deltaMs === null) statusText отдаёт время по гео-IP
  // запрашивающего, поэтому match_date не проставляем вовсе — ключ
  // отсутствует, upsert не трогает колонку, и уже верное время из БД
  // не перетирается худшим.
  const match = {
    home_team: home,
    away_team: away,
    status,
    home_score: homeScore ?? null,
    away_score: awayScore ?? null,
    round: roundNumber,
  }

  if (startDate) {
    match.match_date = startDate
  } else if (deltaMs !== null) {
    const naiveMs = new Date(`${date}T${time}:00+03:00`).getTime()
    match.match_date = Number.isFinite(naiveMs)
      ? new Date(naiveMs + deltaMs).toISOString()
      : `${date}T${time}:00+03:00`
  }

  return match
}

const TIME_RE = /^\d{1,2}:\d{2}$/

function computeTzDeltaMs(html) {
  // Самокалибровка таймзоны: реальное время (startDate) минус сырое время
  // (statusText как +03) даёт сдвиг, под который рендерит страницу IP-гео.
  // Достаточно одного стартового блока — сдвиг один на всю страницу.
  // Если подходящего блока нет, возвращаем null, а не 0: нулевой сдвиг
  // неотличим от «калибровка прошла и IP в Москве» и молча записывал бы
  // время по гео запросившего (с сервера США 14:00 МСК уехало бы в 07:00).
  const sections = html.split(/(?=<div class="cmp_stg_ttl">)/)

  for (const section of sections) {
    const blocks = section.split(/<div class="game_block /).slice(1)
    for (const raw of blocks) {
      const block = '<div class="game_block ' + raw
      const startDateMatch = block.match(/"startDate":"([^"]+)"/)
      const statusMatch = block.match(
        /<div class="status"><span[^>]*>([\s\S]*?)<\/span><\/div>/
      )
      if (!startDateMatch || !statusMatch) continue
      const statusText = statusMatch[1].trim()
      if (!statusText.includes(',')) continue
      const [datePart, timePart] = statusText.split(',').map(s => s.trim())
      if (!TIME_RE.test(timePart)) continue

      const trueMs = new Date(startDateMatch[1]).getTime()
      const naiveMs = new Date(`${parseDate(datePart)}T${timePart}:00+03:00`).getTime()
      if (Number.isFinite(trueMs) && Number.isFinite(naiveMs)) {
        return trueMs - naiveMs
      }
    }
  }

  return null
}

function parseMatchesFromHTML(html, deltaMs) {
  const matches = []
  const sections = html.split(/(?=<div class="cmp_stg_ttl">)/)
  const rawBlocks = []

  for (const section of sections) {
    const roundMatch = section.match(
      /<div class="cmp_stg_ttl">(\d+)-й тур<\/div>/
    )
    if (!roundMatch) continue

    const roundNumber = parseInt(roundMatch[1])
    const gameBlocks = section.split(/<div class="game_block /)

    for (let i = 1; i < gameBlocks.length; i++) {
      rawBlocks.push({
        block: '<div class="game_block ' + gameBlocks[i],
        roundNumber,
      })
    }
  }

  // undefined — сдвиг не передан, считаем его по этой же странице;
  // явный null — калибровка недоступна, время не угадываем.
  if (deltaMs === undefined) deltaMs = computeTzDeltaMs(html)

  for (const { block, roundNumber } of rawBlocks) {
    const m = parseGameBlock(block, roundNumber, deltaMs)
    if (m) matches.push(m)
  }

  return matches
}

function parseTeamSoccer365Id(region) {
  const m = region.match(/_(\d+)\.png/)
  return m ? parseInt(m[1]) : null
}

function parseLiveScoresFromHTML(html) {
  const scores = []
  const blocks = html.split(/<div id="gm\d+"/)

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    const statusAttrMatch = block.match(/dt-status="([iuf])"/)
    if (!statusAttrMatch) continue
    const statusAttr = statusAttrMatch[1]
    // 'u' = upcoming (no score), 'f' = finished (authoritative source is /results/)
    if (statusAttr === 'u') continue

    const htStart = block.indexOf('<div class="ht">')
    const atStart = block.indexOf('<div class="at">')
    if (htStart === -1 || atStart === -1 || atStart < htStart) continue

    const homeRegion = block.slice(htStart, atStart)
    const awayRegion = block.slice(atStart)

    const homeId = parseTeamSoccer365Id(homeRegion)
    const awayId = parseTeamSoccer365Id(awayRegion)
    if (homeId === null || awayId === null) continue

    const home = teamName(homeId)
    const away = teamName(awayId)
    if (!home || !away) continue

    const homeGls = homeRegion.match(/<div class="gls">([^<]+)<\/div>/)
    const awayGls = awayRegion.match(/<div class="gls">([^<]+)<\/div>/)
    if (!homeGls || !awayGls) continue

    const hs = parseInt(homeGls[1].trim())
    const as = parseInt(awayGls[1].trim())
    if (isNaN(hs) || isNaN(as)) continue

    if (statusAttr === 'f') continue

    const statusTextMatch = block.match(/<div class="status"><span[^>]*>([\s\S]*?)<\/span><\/div>/)
    const statusText = statusTextMatch ? statusTextMatch[1] : ''
    const status = /Перерыв|HT/.test(statusText) ? 'HALFTIME' : 'LIVE'

    const roundMatch = block.match(/<div class="stage">(\d+)-й тур<\/div>/)
    scores.push({
      home_team: home,
      away_team: away,
      home_score: hs,
      away_score: as,
      status,
      round: roundMatch ? parseInt(roundMatch[1]) : null,
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

const FETCH_TIMEOUT_MS = 20_000

async function fetchHtml(path, timeoutMs = FETCH_TIMEOUT_MS) {
  const url = `https://soccer365.ru${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
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

    // Таймаут распространяется и на чтение тела: soccer365 держит сокет
    // открытым, отдавая большой/медленный HTML, из-за чего await
    // response.text() может висеть дольше timeoutMs, синк не доходит до
    // upsert и лок остаётся захваченным навсегда.
    // ld+json (startDate в <script>) нужен для калибровки таймзоны в
    // computeTzDeltaMs, поэтому скрипты НЕ вырезаем.
    return await Promise.race([
      await response.text(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Body read timeout ${timeoutMs}ms for ${path}`)), timeoutMs)
      ),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function fetchHtmlWithTimeout(path) {
  try {
    return await fetchHtml(path)
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error(`Timeout ${FETCH_TIMEOUT_MS}ms for ${path}`)
    }
    throw err
  }
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

  // Таймаут на ВСЕ Supabase-вызовы: supabase-js по умолчанию не ограничивает
  // время запроса (бесконечное ожидание сокета), из-за чего любой rpc/select/
  // upsert мог висеть вечно, синк не доходил до finish_sync и лок захватывался
  // навсегда. Привязываем AbortSignal к каждому запросу к БД.
  const SUPABASE_FETCH_TIMEOUT_MS = 25_000
  const supabaseFetchWithTimeout = (input, init) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: supabaseFetchWithTimeout },
  })
  const log = []
  const errors = []

  // ── Heartbeat: прогон визуально отслеживаем по БД, а не по логам Vercel.
  // Каждый шаг пишет last_step/last_heartbeat для своей lock_id — если синк
  // зависнет, одной строкой в sync_state будет видно, на каком шаге.
  async function heartbeat(step) {
    const { error: hbError } = await supabase.rpc('heartbeat_sync', {
      p_lock_id: lockId,
      p_step: step,
    })
    if (hbError) console.warn('Heartbeat warn:', hbError.message)
  }

  // ── 0. Atomic sync lock (dedup between cron / button / auto-sync tabs) ──
  const { data: claimData, error: claimError } = await supabase.rpc('claim_sync', {
    p_stale: '10 minutes',
  })

  if (claimError) {
    console.error('Claim error:', claimError.message)
    return res.status(500).json({ status: 'error', errors: [`Claim error: ${claimError.message}`] })
  }

  if (!claimData || claimData.length === 0) {
    log.push('Another sync is already in progress')
    return res.status(200).json({ status: 'busy', log, errors: [] })
  }

  const lockId = claimData[0].lock_id
  let success = false

  try {
    // ── 1. Fetch pages in parallel (schedule, results, live) ──
    log.push('Fetching schedule, results, live...')
    const [schedulePage, resultsPage, livePage] = await Promise.allSettled([
      fetchHtmlWithTimeout('/competitions/13/shedule/'),
      fetchHtmlWithTimeout('/competitions/13/results/'),
      fetchHtmlWithTimeout('/online/'),
    ])

    const scheduleHtml = schedulePage.status === 'fulfilled' ? schedulePage.value : null
    const resultsHtml = resultsPage.status === 'fulfilled' ? resultsPage.value : null
    const liveHtml = livePage.status === 'fulfilled' ? livePage.value : null

    if (schedulePage.status === 'rejected') errors.push(`Schedule fetch error: ${schedulePage.reason.message}`)
    if (resultsPage.status === 'rejected') errors.push(`Results fetch error: ${resultsPage.reason.message}`)
    if (livePage.status === 'rejected') errors.push(`Live fetch error: ${livePage.reason.message}`)

    const scheduleMatches = scheduleHtml ? parseMatchesFromHTML(scheduleHtml) : []
    // Таймзона рендера одна для всех страниц сайта с одного IP; результаты
    // ld+json не содержат, поэтому передаём им сдвиг, посчитанный по расписанию.
    const tzDeltaMs = computeTzDeltaMs(scheduleHtml ?? '')
    if (tzDeltaMs === null) {
      log.push('WARNING: калибровка таймзоны недоступна — время матчей без ld+json не обновляется (прежние значения в БД сохраняются)')
    }
    const resultMatches = resultsHtml ? parseMatchesFromHTML(resultsHtml, tzDeltaMs) : []
    const liveScores = liveHtml ? parseLiveScoresFromHTML(liveHtml) : []
    log.push(`Parsed ${scheduleMatches.length} scheduled, ${resultMatches.length} finished, ${liveScores.length} live`)

    // ── 2. Snapshot current rows + detect changes vs parsed data ──
    const finishedParsed = resultMatches.filter(m => m.status === 'FINISHED')
    const existingMap = new Map()

    const matchesSnapshot = await supabase
      .from('matches')
      .select('round, home_team, away_team, home_score, away_score, status, match_date, stadium_name')
      .limit(1000)

    if (matchesSnapshot.error) {
      errors.push(`Matches snapshot error: ${matchesSnapshot.error.message}`)
    } else {
      for (const row of matchesSnapshot.data ?? []) {
        existingMap.set(`${row.round}|${row.home_team}|${row.away_team}`, row)
      }
    }

    let hasNewResults = finishedParsed.length > 0 && Boolean(matchesSnapshot.error)
    if (!matchesSnapshot.error && finishedParsed.length > 0) {
      hasNewResults = finishedParsed.some(m => {
        const stored = existingMap.get(`${m.round}|${m.home_team}|${m.away_team}`)
        if (!stored) return true
        return (stored.home_score ?? null) !== (m.home_score ?? null)
          || (stored.away_score ?? null) !== (m.away_score ?? null)
          || stored.status !== 'FINISHED'
      })
    }
    if (hasNewResults) log.push('New finished results detected')

    // ── 3. Fetch standings and compare with DB ──
    let standings = []
    let standingsChanged = false

    log.push('Fetching standings...')
    try {
      const standingsHtml = await fetchHtmlWithTimeout('/competitions/13/')
      const parsedStandings = parseStandingsFromHTML(standingsHtml)
      log.push(`Parsed ${parsedStandings.length} standings entries`)

      const { data: existingStandings, error: existingStandingsError } = await supabase
        .from('standings')
        .select('team_id, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points')
        .order('team_id')

      if (existingStandingsError) {
        errors.push(`Standings snapshot error: ${existingStandingsError.message}`)
        standings = parsedStandings
        standingsChanged = true
      } else {
        const existingMap = new Map()
        for (const row of existingStandings ?? []) {
          existingMap.set(row.team_id, row)
        }
        standings = parsedStandings.filter(s => {
          const e = existingMap.get(s.team_id)
          if (!e) return true
          return e.position !== s.position
            || e.played !== s.played
            || e.won !== s.won
            || e.drawn !== s.drawn
            || e.lost !== s.lost
            || e.goals_for !== s.goals_for
            || e.goals_against !== s.goals_against
            || e.goal_difference !== s.goal_difference
            || e.points !== s.points
        })
        standingsChanged = standings.length > 0
        if (standingsChanged) {
          log.push(`${standings.length} of ${parsedStandings.length} standings entries changed`)
        } else {
          log.push('Standings unchanged — skipping upsert')
        }
      }
    } catch (err) {
      errors.push(`Standings fetch error: ${err.message}`)
    }

    // ── 4. Merge matches ──
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
            status: live.status,
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
          status: live.status,
          home_score: live.home_score,
          away_score: live.away_score,
          round: live.round ?? 0,
        })
      }
    }

    const allMatches = Array.from(matchMap.values())
    log.push(`Total unique matches to upsert: ${allMatches.length}`)

    const dateEpoch = (d) => {
      const t = d ? new Date(d).getTime() : NaN
      return Number.isFinite(t) ? t : ''
    }
    // stadium_name парсер не отдаёт (всегда ''), а в БД он заполнен — оставлять
    // его в отпечатке нельзя, иначе каждая такая строка вечно считается
    // изменённой и переписывается на каждом прогоне.
    const matchFingerprint = (m) =>
      `${m.home_score ?? ''}|${m.away_score ?? ''}|${m.status}|${dateEpoch(m.match_date)}`

    // ── 5. Upsert only matches that actually changed ──
    const changedMatches = []
    for (const m of allMatches) {
      const stored = existingMap.get(`${m.round}|${m.home_team}|${m.away_team}`)
      if (!stored) {
        changedMatches.push(m)
        continue
      }
      // Не вычисленное время (нет ld+json и нет калибровки) не считаем
      // изменением: подставляем сохранённое в БД, чтобы сравнение решало
      // только про счёт и статус — иначе строка переписывалась бы вечно.
      const comparable = m.match_date === undefined ? { ...m, match_date: stored.match_date } : m
      if (matchFingerprint(stored) !== matchFingerprint(comparable)) {
        changedMatches.push(m)
      }
    }

    log.push(`${changedMatches.length} changed, ${allMatches.length - changedMatches.length} unchanged`)

    if (changedMatches.length > 0) {
      const { error: matchError } = await supabase
        .from('matches')
        .upsert(changedMatches, {
          onConflict: 'round, home_team, away_team',
          ignoreDuplicates: false,
        })

      if (matchError) {
        errors.push(`Match upsert error: ${matchError.message}`)
      } else {
        log.push(`Upserted ${changedMatches.length} changed matches successfully`)
      }
    } else {
      log.push('No matches changed — skipping match upsert')
    }

    // ── 5.1. Bulk recalc of prediction points (idempotent, always run) ──
    const { data: recalcCount, error: recalcError } = await supabase
      .rpc('recalculate_finished_predictions')

    if (recalcError) {
      errors.push(`Recalculate error: ${recalcError.message}`)
    } else {
      log.push(`Recalculated points for ${recalcCount ?? 0} predictions`)
    }

    // ── 6. Upsert standings (only when changed) ──
    if (standingsChanged && standings.length > 0) {
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

    // ── 6.1. Leaderboard matview пересчитывается отдельным эндпоинтом
    //        (api/refresh-leaderboard.js) при заходе на страницу — крон его не трогает.

    // ── 7. Response ──
    success = errors.length === 0
    const status = success ? 200 : 207
    return res.status(status).json({
      status: success ? 'ok' : 'partial',
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
  } finally {
    // ── 8. Release the lock and record the outcome ──
    try {
      await supabase.rpc('finish_sync', {
        p_lock_id: lockId,
        p_success: success,
      })
      log.push('Sync lock released')
    } catch (err) {
      console.error('Finish sync error:', err)
    }
  }
}

// ── Smoke test: verify live parser against current /online/ ────────────
if (process.argv.includes('--test-live-parse')) {
  try {
    const html = await fetchHtmlWithTimeout('/online/')
    const scores = parseLiveScoresFromHTML(html)
    console.log(`Parsed ${scores.length} live RFPL matches`)
    for (const s of scores) {
      console.log(`  ${s.home_team} ${s.home_score}:${s.away_score} ${s.away_team} [${s.status}] round=${s.round}`)
    }
    process.exit(scores.length > 0 ? 0 : 1)
  } catch (err) {
    console.error('Test failed:', err.message)
    process.exit(1)
  }
}
