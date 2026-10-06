const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = понедельник … 6 = воскресенье */
export function weekdayIdx(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIdx(iso))
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000)
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WEEKDAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export const MONTHS_NOM = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export function fmtDayMonth(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function fmtShort(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function fmtLong(iso: string): string {
  const d = parseISO(iso)
  const today = todayISO()
  const diff = diffDays(iso, today)
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
  if (diff === 0) return `Сегодня, ${base}`
  if (diff === -1) return `Вчера, ${base}`
  if (diff === 1) return `Завтра, ${base}`
  return `${WEEKDAYS_FULL[weekdayIdx(iso)][0].toUpperCase()}${WEEKDAYS_FULL[weekdayIdx(iso)].slice(1)}, ${base}`
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  return `${m}:${pad(s % 60)}`
}

export function fmtMinutes(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} мин`
  return `${Math.floor(m / 60)} ч ${m % 60} мин`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
