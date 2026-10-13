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

export function formatScore(home: number, away: number): string {
  return `${home}:${away}`
}
