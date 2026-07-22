const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

const WEEKDAYS = [
  'воскресенье', 'понедельник', 'вторник', 'среда',
  'четверг', 'пятница', 'суббота',
]

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function formatWeekday(date: string | Date, format: 'long' | 'short' = 'long'): string {
  const d = new Date(date)
  return format === 'long' ? WEEKDAYS[d.getDay()] : WEEKDAYS_SHORT[d.getDay()]
}

export function formatDate(date: string | Date, format: 'long' | 'short' = 'long'): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = format === 'long' ? MONTHS[d.getMonth()] : MONTHS_SHORT[d.getMonth()]
  const year = d.getFullYear()

  if (format === 'short') {
    return `${day}.${String(d.getMonth() + 1).padStart(2, '0')}.${year}`
  }

  return `${day} ${month} ${year}`
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const time = formatTime(d)
  return `${day} ${month}, ${time}`
}

export function formatScore(home: number, away: number): string {
  return `${home}:${away}`
}

export function formatOutcome(outcome: '1' | 'X' | '2'): string {
  const map: Record<string, string> = {
    '1': 'П1',
    'X': 'Н',
    '2': 'П2',
  }
  return map[outcome] || outcome
}

export function formatPoints(points: number): string {
  const lastDigit = points % 10
  const lastTwoDigits = points % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${points} очков`
  }

  if (lastDigit === 1) {
    return `${points} очко`
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${points} очка`
  }

  return `${points} очков`
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'сегодня'
  }
  if (diffDays === 1) {
    return 'завтра'
  }
  if (diffDays === -1) {
    return 'вчера'
  }
  if (diffDays > 0 && diffDays < 7) {
    return `через ${diffDays} дн.`
  }
  if (diffDays < 0 && diffDays > -7) {
    return `${Math.abs(diffDays)} дн. назад`
  }

  return formatDate(date, 'short')
}
