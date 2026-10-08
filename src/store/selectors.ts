import type { AppState, CardioLog, ComplexId, PostureLog, Profile, WeightEntry, WorkoutLog } from '../types'
import { addDays, diffDays, mondayOf, parseISO } from '../lib/date'
import { TOTAL_WEEKS } from '../data/program'
import { EXERCISES } from '../data/exercises'

/** Неделя программы для даты (может быть > 8 — программа завершена) */
export function rawWeek(profile: Profile, iso: string): number {
  const week = Math.floor(diffDays(iso, profile.programStart) / 7) + 1
  return Number.isFinite(week) ? week : 1
}

export function programWeek(profile: Profile, iso: string): number {
  return Math.min(Math.max(rawWeek(profile, iso), 1), TOTAL_WEEKS)
}

/** Сдвигает начало программы так, чтобы текущая дата попала в неделю n */
export function startForWeek(iso: string, n: number): string {
  return addDays(mondayOf(iso), -7 * (n - 1))
}

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  if (!weights.length) return null
  return weights.reduce((a, b) => (a.date >= b.date ? a : b))
}

/** Средний темп, кг/нед (отрицательный — снижение), по записям за последние 28 дней */
export function weeklyPace(weights: WeightEntry[], today: string): number | null {
  const pts = weights.filter((w) => diffDays(today, w.date) <= 28)
  if (pts.length < 2) return null
  const xs = pts.map((p) => diffDays(p.date, today))
  const span = Math.max(...xs) - Math.min(...xs)
  if (span < 7) return null
  const ys = pts.map((p) => p.kg)
  const n = xs.length
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (!den) return null
  return (num / den) * 7
}

export interface DayStatus {
  strength: WorkoutLog[]
  cardio: CardioLog[]
  /** Ежедневный комплекс для осанки */
  posture: PostureLog | undefined
  /** Комплекс «Спина и таз» */
  back: PostureLog | undefined
}

export const isComplex = (p: PostureLog, c: ComplexId) => (p.complex ?? 'daily') === c

export function dayStatus(s: AppState, iso: string): DayStatus {
  return {
    strength: s.workouts.filter((w) => w.date === iso),
    cardio: s.cardio.filter((c) => c.date === iso),
    posture: s.posture.find((p) => p.date === iso && isComplex(p, 'daily')),
    back: s.posture.find((p) => p.date === iso && isComplex(p, 'back')),
  }
}

export function postureStreak(posture: PostureLog[], today: string): number {
  const set = new Set(posture.filter((p) => isComplex(p, 'daily')).map((p) => p.date))
  let d = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function postureThisWeek(posture: PostureLog[], today: string, complex: ComplexId = 'daily'): number {
  const mon = mondayOf(today)
  return posture.filter((p) => isComplex(p, complex) && p.date >= mon && p.date <= addDays(mon, 6)).length
}

/** Сколько снарядов поднимается: у пары гантелей записывается вес одной */
export function loadFactor(exerciseId: string): number {
  return EXERCISES[exerciseId]?.implement === 'pair' ? 2 : 1
}

export function volumeOf(log: WorkoutLog): number {
  let v = 0
  for (const ex of log.exercises) {
    const k = loadFactor(ex.exerciseId)
    for (const s of ex.sets) if (s.done && s.weight && s.reps) v += s.weight * s.reps * k
  }
  return Math.round(v)
}

export function doneSets(log: WorkoutLog): number {
  return log.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0)
}

export function totalSets(log: WorkoutLog): number {
  return log.exercises.reduce((n, ex) => n + ex.sets.length, 0)
}

export function sortByDateDesc<T extends { date: string }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => b.date.localeCompare(a.date))
}

export function monthGrid(year: number, month: number): string[] {
  // 6 недель по 7 дней, начиная с понедельника
  const first = new Date(year, month, 1)
  const startIso = mondayOf(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`)
  return Array.from({ length: 42 }, (_, i) => addDays(startIso, i))
}

export function isSameMonth(iso: string, year: number, month: number) {
  const d = parseISO(iso)
  return d.getFullYear() === year && d.getMonth() === month
}
