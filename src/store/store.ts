import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { AppState as NativeAppState } from 'react-native'
import type { ActiveSession, AppState, CardioLog, ComplexId, Feeling, LoggedExercise, PostureLog, Profile, Settings, WorkoutId, WorkoutLog } from '../types'
import { mondayOf, todayISO } from '../lib/date'
import { repsFor, repsLabel, setsFor, WORKOUTS } from '../data/program'

const KEY = 'homefit.v1'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function defaults(): AppState {
  const today = todayISO()
  return {
    version: 1,
    profile: { heightCm: 187, startWeight: 116, goalWeight: 105, initialWeight: 135, programStart: mondayOf(today) },
    settings: { sound: true, vibration: true },
    weights: [{ id: uid(), date: today, kg: 116 }], workouts: [], cardio: [], posture: [], active: null,
  }
}

let state = defaults()
let ready = false
let storageOk = true
let persistTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

async function persistNow() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); storageOk = true } catch { storageOk = false }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistNow, 250)
}

NativeAppState.addEventListener('change', (next) => { if (next !== 'active' && persistTimer) persistNow() })

export async function initializeStore() {
  if (ready) return
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>
      const d = defaults()
      state = {
        ...d, ...saved,
        profile: { ...d.profile, ...saved.profile }, settings: { ...d.settings, ...saved.settings },
        weights: Array.isArray(saved.weights) ? saved.weights : d.weights,
        workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
        cardio: Array.isArray(saved.cardio) ? saved.cardio : [],
        posture: Array.isArray(saved.posture) ? saved.posture : [], active: saved.active ?? null,
      }
    }
  } catch { storageOk = false }
  ready = true
  emit()
}

function set(next: AppState) {
  state = next
  emit()
  schedulePersist()
}

export const update = (fn: (s: AppState) => AppState) => set(fn(state))
export const getState = () => state
export const isStorageOk = () => storageOk
export const isStoreReady = () => ready
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener) }, () => selector(state), () => selector(state))
}

export const actions = {
  saveWeight(date: string, kg: number) { update((s) => ({ ...s, weights: [...s.weights.filter((w) => w.date !== date), { id: uid(), date, kg }].sort((a, b) => a.date.localeCompare(b.date)) })) },
  deleteWeight(id: string) { update((s) => ({ ...s, weights: s.weights.filter((w) => w.id !== id) })) },
  updateProfile(p: Partial<Profile>) { update((s) => ({ ...s, profile: { ...s.profile, ...p } })) },
  updateSettings(p: Partial<Settings>) { update((s) => ({ ...s, settings: { ...s.settings, ...p } })) },
  startWorkout(workoutId: WorkoutId, week: number, date: string) {
    const workout = WORKOUTS[workoutId]
    const active: ActiveSession = {
      id: uid(), workoutId, week, date, startedAt: Date.now(), warmup: [false, false, false, false, false, false], current: 0, rest: null,
      exercises: workout.items.map((item, index) => {
        const previous = lastSetsFor(state.workouts, item.exerciseId)
        return { exerciseId: item.exerciseId, sets: Array.from({ length: setsFor(item, index, week) }, (_, setIndex) => {
          const last = previous?.[Math.min(setIndex, (previous?.length ?? 1) - 1)]
          return { weight: last?.weight == null ? '' : String(last.weight).replace('.', ','), reps: '', done: false }
        }) }
      }),
    }
    update((s) => ({ ...s, active }))
  },
  updateActive(fn: (a: ActiveSession) => ActiveSession) { update((s) => s.active ? { ...s, active: fn(s.active) } : s) },
  swapExercise(index: number, exerciseId: string) {
    const previous = lastSetsFor(state.workouts, exerciseId)
    update((s) => s.active ? {
      ...s,
      active: {
        ...s.active,
        exercises: s.active.exercises.map((exercise, exerciseIndex) => exerciseIndex !== index ? exercise : {
          exerciseId,
          sets: exercise.sets.map((_, setIndex) => {
            const last = previous?.[Math.min(setIndex, (previous?.length ?? 1) - 1)]
            return { weight: last?.weight == null ? '' : String(last.weight).replace('.', ','), reps: '', done: false }
          }),
        }),
      },
    } : s)
  },
  discardWorkout() { update((s) => ({ ...s, active: null })) },
  finishWorkout(feeling: Feeling | null, note = ''): WorkoutLog | null {
    const active = state.active
    if (!active) return null
    const workout = WORKOUTS[active.workoutId]
    const exercises: LoggedExercise[] = active.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      target: `${exercise.sets.length} × ${repsLabel(repsFor(workout.items[index], active.week))}`,
      sets: exercise.sets.map((setItem) => ({ weight: setItem.weight.trim() ? Number(setItem.weight.replace(',', '.')) : null, reps: setItem.reps.trim() ? Number(setItem.reps) : null, done: setItem.done })),
    }))
    const log: WorkoutLog = { id: active.id, workoutId: active.workoutId, week: active.week, date: active.date, startedAt: active.startedAt, finishedAt: Date.now(), exercises, feeling, note }
    update((s) => ({ ...s, active: null, workouts: [...s.workouts, log] }))
    return log
  },
  addCardio(log: Omit<CardioLog, 'id'>) { update((s) => ({ ...s, cardio: [...s.cardio, { ...log, id: uid() }] })) },
  deleteCardio(id: string) { update((s) => ({ ...s, cardio: s.cardio.filter((c) => c.id !== id) })) },
  deleteWorkout(id: string) { update((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) })) },
  markPosture(log: PostureLog) { const kind = log.complex ?? 'daily'; update((s) => ({ ...s, posture: [...s.posture.filter((p) => !(p.date === log.date && (p.complex ?? 'daily') === kind)), log] })) },
  unmarkPosture(date: string, complex: ComplexId = 'daily') { update((s) => ({ ...s, posture: s.posture.filter((p) => !(p.date === date && (p.complex ?? 'daily') === complex)) })) },
  resetAll() { set(defaults()) },
}

export function lastSetsFor(workouts: WorkoutLog[], exerciseId: string) {
  for (let index = workouts.length - 1; index >= 0; index--) {
    const exercise = workouts[index].exercises.find((item) => item.exerciseId === exerciseId)
    if (exercise?.sets.some((item) => item.done)) return exercise.sets.filter((item) => item.done)
  }
  return null
}
