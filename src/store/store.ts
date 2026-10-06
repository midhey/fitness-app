import { useSyncExternalStore } from 'react'
import type {
  ActiveSession,
  AppState,
  CardioLog,
  ComplexId,
  Feeling,
  LoggedExercise,
  PostureLog,
  Profile,
  Settings,
  WorkoutId,
  WorkoutLog,
} from '../types'
import { mondayOf, todayISO } from '../lib/date'
import { repsFor, repsLabel, setsFor, WORKOUTS } from '../data/program'

const KEY = 'homefit.v1'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function defaults(): AppState {
  const today = todayISO()
  return {
    version: 1,
    profile: {
      heightCm: 187,
      startWeight: 116,
      goalWeight: 105,
      initialWeight: 135,
      programStart: mondayOf(today),
    },
    settings: { sound: true, vibration: true },
    weights: [{ id: uid(), date: today, kg: 116 }],
    workouts: [],
    cardio: [],
    posture: [],
    active: null,
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const s = JSON.parse(raw) as Partial<AppState>
    const d = defaults()
    return {
      version: 1,
      profile: { ...d.profile, ...s.profile },
      settings: { ...d.settings, ...s.settings },
      weights: Array.isArray(s.weights) ? s.weights : d.weights,
      workouts: Array.isArray(s.workouts) ? s.workouts : [],
      cardio: Array.isArray(s.cardio) ? s.cardio : [],
      posture: Array.isArray(s.posture) ? s.posture : [],
      active: s.active ?? null,
    }
  } catch {
    return defaults()
  }
}

let state: AppState = load()
let storageOk = true
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    storageOk = true
  } catch {
    storageOk = false
  }
}

function set(next: AppState) {
  state = next
  persist()
  for (const l of listeners) l()
}

export function update(fn: (s: AppState) => AppState) {
  set(fn(state))
}

export function getState() {
  return state
}

export function isStorageOk() {
  return storageOk
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => selector(state),
    () => selector(state),
  )
}

// Синхронизация между вкладками
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load()
    for (const l of listeners) l()
  }
})

// ---------- действия ----------

export const actions = {
  saveWeight(date: string, kg: number) {
    update((s) => {
      const rest = s.weights.filter((w) => w.date !== date)
      const weights = [...rest, { id: uid(), date, kg }].sort((a, b) => a.date.localeCompare(b.date))
      return { ...s, weights }
    })
  },
  deleteWeight(id: string) {
    update((s) => ({ ...s, weights: s.weights.filter((w) => w.id !== id) }))
  },
  updateProfile(p: Partial<Profile>) {
    update((s) => ({ ...s, profile: { ...s.profile, ...p } }))
  },
  updateSettings(p: Partial<Settings>) {
    update((s) => ({ ...s, settings: { ...s.settings, ...p } }))
  },

  startWorkout(workoutId: WorkoutId, week: number, date: string) {
    const w = WORKOUTS[workoutId]
    const prev = state
    const active: ActiveSession = {
      id: uid(),
      workoutId,
      week,
      date,
      startedAt: Date.now(),
      warmup: [false, false, false, false, false, false],
      current: -1,
      exercises: w.items.map((item, i) => {
        const n = setsFor(item, i, week)
        const last = lastSetsFor(prev.workouts, item.exerciseId)
        return {
          exerciseId: item.exerciseId,
          sets: Array.from({ length: n }, (_, k) => {
            const ls = last?.[Math.min(k, last.length - 1)]
            return { weight: ls?.weight != null ? String(ls.weight).replace('.', ',') : '', reps: '', done: false }
          }),
        }
      }),
      rest: null,
    }
    update((s) => ({ ...s, active }))
  },
  updateActive(fn: (a: ActiveSession) => ActiveSession) {
    update((s) => (s.active ? { ...s, active: fn(s.active) } : s))
  },
  /** Заменить упражнение в текущей тренировке на взаимозаменяемый вариант (гантели ↔ штанга) */
  swapExercise(index: number, exerciseId: string) {
    const last = lastSetsFor(state.workouts, exerciseId)
    update((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e, i) =>
                i === index
                  ? {
                      exerciseId,
                      sets: e.sets.map((_, k) => {
                        const ls = last?.[Math.min(k, last.length - 1)]
                        return { weight: ls?.weight != null ? String(ls.weight).replace('.', ',') : '', reps: '', done: false }
                      }),
                    }
                  : e,
              ),
            },
          }
        : s,
    )
  },
  discardWorkout() {
    update((s) => ({ ...s, active: null }))
  },
  finishWorkout(feeling: Feeling | null, note: string): WorkoutLog | null {
    const a = state.active
    if (!a) return null
    const w = WORKOUTS[a.workoutId]
    const exercises: LoggedExercise[] = a.exercises.map((ex, i) => {
      const item = w.items[i]
      return {
        exerciseId: ex.exerciseId,
        target: `${ex.sets.length} × ${repsLabel(repsFor(item, a.week))}`,
        sets: ex.sets.map((st) => ({
          weight: st.weight.trim() === '' ? null : Number(st.weight.replace(',', '.')),
          reps: st.reps.trim() === '' ? null : Number(st.reps),
          done: st.done,
        })),
      }
    })
    const log: WorkoutLog = {
      id: a.id,
      workoutId: a.workoutId,
      week: a.week,
      date: a.date,
      startedAt: a.startedAt,
      finishedAt: Date.now(),
      exercises,
      feeling,
      note,
    }
    update((s) => ({ ...s, active: null, workouts: [...s.workouts, log] }))
    return log
  },
  deleteWorkout(id: string) {
    update((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
  },

  addCardio(log: Omit<CardioLog, 'id'>) {
    update((s) => ({ ...s, cardio: [...s.cardio, { ...log, id: uid() }] }))
  },
  deleteCardio(id: string) {
    update((s) => ({ ...s, cardio: s.cardio.filter((c) => c.id !== id) }))
  },

  markPosture(log: PostureLog) {
    const c = log.complex ?? 'daily'
    update((s) => ({
      ...s,
      posture: [...s.posture.filter((p) => !(p.date === log.date && (p.complex ?? 'daily') === c)), log],
    }))
  },
  unmarkPosture(date: string, complex: ComplexId = 'daily') {
    update((s) => ({ ...s, posture: s.posture.filter((p) => !(p.date === date && (p.complex ?? 'daily') === complex)) }))
  },

  resetAll() {
    set(defaults())
  },
}

/** Последние выполненные подходы упражнения (из любой тренировки) */
export function lastSetsFor(workouts: WorkoutLog[], exerciseId: string) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.some((s) => s.done)) return ex.sets.filter((s) => s.done)
  }
  return null
}

export function lastLogFor(workouts: WorkoutLog[], exerciseId: string) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.some((s) => s.done)) return { log: workouts[i], ex }
  }
  return null
}
