import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { AppState as NativeAppState } from 'react-native'
import type {
  ActiveSession,
  AppState,
  CardioLog,
  ComplexId,
  DraftSet,
  Feeling,
  LoggedExercise,
  PostureLog,
  Profile,
  Settings,
  WorkoutId,
  WorkoutLog,
} from '../types'
import { isValidISO, mondayOf, todayISO } from '../lib/date'
import { repsFor, repsLabel, setsFor, WORKOUTS } from '../data/program'

const KEY = 'homefit.v1'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function defaults(): AppState {
  const today = todayISO()
  return {
    version: 1,
    profile: { heightCm: 187, startWeight: 116, goalWeight: 105, initialWeight: 135, programStart: mondayOf(today) },
    settings: { sound: true, vibration: true },
    weights: [{ id: uid(), date: today, kg: 116 }],
    workouts: [],
    cardio: [],
    posture: [],
    active: null,
  }
}

/**
 * Проблема с хранилищем:
 * - read: не удалось прочитать — запись заблокирована, чтобы не затереть сохранённые данные значениями по умолчанию;
 * - corrupt: сохранённые данные повреждены, исходная строка скопирована в резервный ключ;
 * - write: последняя запись не удалась.
 */
export type StorageIssue = null | { kind: 'read' | 'corrupt' | 'write'; backupKey?: string }

let state = defaults()
let ready = false
let issue: StorageIssue = null
let persistBlocked = false
let persistTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function setIssue(next: StorageIssue) {
  issue = next
  emit()
}

async function persistNow() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (persistBlocked) return
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state))
    if (issue?.kind === 'write') setIssue(null)
  } catch {
    setIssue({ kind: 'write' })
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistNow, 250)
}

NativeAppState.addEventListener('change', (next) => {
  if (next !== 'active' && persistTimer) persistNow()
})

function merge(saved: Partial<AppState>): AppState {
  const d = defaults()
  const profile = { ...d.profile, ...saved.profile }
  if (!isValidISO(profile.programStart)) profile.programStart = d.profile.programStart
  return {
    version: 1,
    profile,
    settings: { ...d.settings, ...saved.settings },
    weights: Array.isArray(saved.weights) ? saved.weights : d.weights,
    workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
    cardio: Array.isArray(saved.cardio) ? saved.cardio : [],
    posture: Array.isArray(saved.posture) ? saved.posture : [],
    active: saved.active ?? null,
  }
}

async function readSaved() {
  let raw: string | null
  try {
    raw = await AsyncStorage.getItem(KEY)
  } catch {
    // Повтор: на Android первое обращение к хранилищу иногда падает при холодном старте
    raw = await AsyncStorage.getItem(KEY)
  }
  return raw
}

export async function initializeStore() {
  if (ready) return
  let raw: string | null = null
  try {
    raw = await readSaved()
  } catch {
    persistBlocked = true
    issue = { kind: 'read' }
  }
  if (raw) {
    try {
      state = merge(JSON.parse(raw) as Partial<AppState>)
    } catch {
      const backupKey = `${KEY}.corrupt.${Date.now()}`
      try {
        await AsyncStorage.setItem(backupKey, raw)
        issue = { kind: 'corrupt', backupKey }
      } catch {
        persistBlocked = true
        issue = { kind: 'read' }
      }
    }
  }
  ready = true
  emit()
}

/** Попробовать прочитать данные ещё раз (после ошибки чтения) */
export async function retryLoad() {
  ready = false
  persistBlocked = false
  issue = null
  state = defaults()
  await initializeStore()
}

/** Начать с чистого листа, отказавшись от нечитаемых данных */
export function acceptFreshStart() {
  persistBlocked = false
  setIssue(null)
  schedulePersist()
}

export const dismissStorageIssue = () => setIssue(null)

function set(next: AppState) {
  state = next
  emit()
  schedulePersist()
}

export const update = (fn: (s: AppState) => AppState) => set(fn(state))
export const getState = () => state
export const getStorageIssue = () => issue

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

export function useStorageIssue(): StorageIssue {
  return useSyncExternalStore(subscribe, getStorageIssue, getStorageIssue)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ---------- Действия ----------

const fmtWeight = (value: number | null | undefined) => (value == null ? '' : String(value).replace('.', ','))

function draftSets(count: number, exerciseId: string, workouts: WorkoutLog[]): DraftSet[] {
  const previous = lastSetsFor(workouts, exerciseId)
  return Array.from({ length: count }, (_, index) => {
    const last = previous?.[Math.min(index, previous.length - 1)]
    return { weight: fmtWeight(last?.weight), reps: '', done: false }
  })
}

function mapSets(session: ActiveSession, exerciseIndex: number, fn: (sets: DraftSet[]) => DraftSet[]): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise, index) => (index === exerciseIndex ? { ...exercise, sets: fn(exercise.sets) } : exercise)),
  }
}

export const actions = {
  saveWeight(date: string, kg: number) {
    update((s) => ({
      ...s,
      weights: [...s.weights.filter((w) => w.date !== date), { id: uid(), date, kg }].sort((a, b) => a.date.localeCompare(b.date)),
    }))
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
    const workout = WORKOUTS[workoutId]
    const active: ActiveSession = {
      id: uid(),
      workoutId,
      week,
      date,
      startedAt: Date.now(),
      warmup: [false, false, false, false, false, false],
      current: -1,
      rest: null,
      exercises: workout.items.map((item, index) => ({
        exerciseId: item.exerciseId,
        sets: draftSets(setsFor(item, index, week), item.exerciseId, state.workouts),
      })),
    }
    update((s) => ({ ...s, active }))
  },
  updateActive(fn: (a: ActiveSession) => ActiveSession) {
    update((s) => (s.active ? { ...s, active: fn(s.active) } : s))
  },
  setCurrent(index: number) {
    actions.updateActive((a) => ({ ...a, current: index }))
  },
  setField(exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) {
    actions.updateActive((a) => mapSets(a, exerciseIndex, (sets) => sets.map((x, i) => (i === setIndex ? { ...x, ...patch } : x))))
  },
  addSet(exerciseIndex: number) {
    actions.updateActive((a) =>
      mapSets(a, exerciseIndex, (sets) => [...sets, { weight: sets[sets.length - 1]?.weight ?? '', reps: '', done: false }]),
    )
  },
  removeSet(exerciseIndex: number) {
    actions.updateActive((a) => mapSets(a, exerciseIndex, (sets) => (sets.length > 1 ? sets.slice(0, -1) : sets)))
  },
  /** Заменить упражнение на взаимозаменяемый вариант (гантели ↔ штанга) */
  swapExercise(index: number, exerciseId: string) {
    update((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              exercises: s.active.exercises.map((exercise, i) =>
                i === index ? { exerciseId, sets: draftSets(exercise.sets.length, exerciseId, s.workouts) } : exercise,
              ),
            },
          }
        : s,
    )
  },
  discardWorkout() {
    update((s) => ({ ...s, active: null }))
  },
  finishWorkout(feeling: Feeling | null, note = ''): WorkoutLog | null {
    const active = state.active
    if (!active) return null
    const workout = WORKOUTS[active.workoutId]
    const exercises: LoggedExercise[] = active.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      target: `${exercise.sets.length} × ${repsLabel(repsFor(workout.items[index], active.week))}`,
      sets: exercise.sets.map((x) => ({ weight: toNumber(x.weight), reps: toNumber(x.reps), done: x.done })),
    }))
    const log: WorkoutLog = {
      id: active.id,
      workoutId: active.workoutId,
      week: active.week,
      date: active.date,
      startedAt: active.startedAt,
      finishedAt: Date.now(),
      exercises,
      feeling,
      note: note.trim(),
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
    const kind = log.complex ?? 'daily'
    update((s) => ({
      ...s,
      posture: [...s.posture.filter((p) => !(p.date === log.date && (p.complex ?? 'daily') === kind)), log],
    }))
  },
  unmarkPosture(date: string, complex: ComplexId = 'daily') {
    update((s) => ({ ...s, posture: s.posture.filter((p) => !(p.date === date && (p.complex ?? 'daily') === complex)) }))
  },

  resetAll() {
    set(defaults())
  },
}

function toNumber(value: string): number | null {
  const n = Number(value.trim().replace(',', '.'))
  return value.trim() && Number.isFinite(n) ? n : null
}

/** Последние выполненные подходы упражнения (из любой тренировки) */
export function lastSetsFor(workouts: WorkoutLog[], exerciseId: string) {
  return lastLogFor(workouts, exerciseId)?.sets ?? null
}

/** Последняя тренировка с выполненными подходами упражнения */
export function lastLogFor(workouts: WorkoutLog[], exerciseId: string) {
  for (let index = workouts.length - 1; index >= 0; index--) {
    const exercise = workouts[index].exercises.find((item) => item.exerciseId === exerciseId)
    if (exercise?.sets.some((item) => item.done)) return { log: workouts[index], sets: exercise.sets.filter((item) => item.done) }
  }
  return null
}
