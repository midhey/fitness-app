export type MuscleId =
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'adductors'
  | 'calves'
  | 'chest'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'upperBack'
  | 'lowerTraps'
  | 'lats'
  | 'erectors'
  | 'core'
  | 'obliques'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'serratus'
  | 'neckFlexors'
  | 'hipFlexors'

export type Tracking = 'weighted' | 'bodyweight' | 'optionalWeight'

/** Чем выполняется: пара гантелей (записывается вес одной), одна гантель, штанга (вес всей штанги), без веса */
export type Implement = 'pair' | 'one' | 'barbell' | 'none'

export interface Exercise {
  id: string
  name: string
  /** Короткое имя для чипов и таблиц */
  short: string
  primary: MuscleId[]
  secondary: MuscleId[]
  /** Как держать гантели / где встать */
  setup: string
  steps: string[]
  mistakes: string[]
  tips?: string[]
  /** Что делать, когда вес гантелей упёрся в предел */
  progression: string[]
  /** Ориентир по стартовому весу */
  startWeight?: string
  tracking: Tracking
  implement: Implement
  /** Взаимозаменяемый вариант: гантели ↔ штанга */
  alt?: string
  perSide?: boolean
  /** Подсказка по конкретной неделе (темп, паузы, варианты) */
  weekNotes?: Partial<Record<number, string>>
}

export type WorkoutId = 'A' | 'B' | 'C'

export interface WorkoutItem {
  exerciseId: string
  sets: number
  /** Диапазон повторений, напр. [10, 12] */
  reps: [number, number]
  restSec: number
  /** Переопределение повторений с указанной недели */
  repsFrom?: { week: number; reps: [number, number] }[]
}

export interface Workout {
  id: WorkoutId
  title: string
  focus: string
  minutes: string
  items: WorkoutItem[]
}

export interface WeekPlan {
  n: number
  phase: string
  rir: string
  summary: string
  details: string
  /** -1: на подход меньше (но не меньше 2), 0: как в программе */
  setsDelta: -1 | 0
  /** +1 подход в первом упражнении */
  firstExerciseBonus: boolean
  cardioMin: number
}

export type DayKind = 'strength' | 'cardio' | 'rest'

export interface DayPlan {
  /** 0 = Пн … 6 = Вс */
  weekday: number
  kind: DayKind
  workoutId?: WorkoutId
  title: string
  note: string
}

export type PostureMode =
  | {
      type: 'hold'
      reps: number
      holdSec: number
      /** Время на движение/расслабление между удержаниями */
      moveSec: number
      holdLabel: string
      moveLabel: string
      perSide?: boolean
      sets?: number
      restSec?: number
      setLabels?: string[]
      /** Подписи сторон для perSide; по умолчанию — «правая рука, левая нога» / наоборот */
      sideLabels?: [string, string]
    }
  | { type: 'timed'; seconds: number; rounds: number; perSide: boolean }
  | {
      type: 'paced'
      cycles: number
      phases: { label: string; sec: number }[]
      perSide?: boolean
      /** Подсказка на смене стороны; по умолчанию — «Другая рука за голову» */
      switchSub?: string
    }

export interface PostureExercise {
  id: string
  /** Номер из программы: "1", "3а" … */
  num: string
  name: string
  dose: string
  minutes: number
  primary: MuscleId[]
  effect: string
  steps: string[]
  mistakes: string[]
  tips?: string[]
  mode: PostureMode
  /** Иллюстрация — id из библиотеки анимаций */
  illustration: string
  /** Задача упражнения в комплексе («Мобилизация», «Корпус» …) — для комплекса с ротацией */
  focus?: string
}

// ---------- Сохраняемые данные ----------

export interface Profile {
  heightCm: number
  startWeight: number
  goalWeight: number
  /** Вес до начала снижения (≈), необязательно */
  initialWeight: number | null
  /** Понедельник первой недели программы, YYYY-MM-DD */
  programStart: string
}

export interface Settings {
  sound: boolean
  vibration: boolean
}

export interface WeightEntry {
  id: string
  date: string
  kg: number
}

export interface LoggedSet {
  weight: number | null
  reps: number | null
  done: boolean
}

export interface LoggedExercise {
  exerciseId: string
  target: string
  sets: LoggedSet[]
}

export type Feeling = 'easy' | 'ok' | 'hard'

export interface WorkoutLog {
  id: string
  workoutId: WorkoutId
  week: number
  date: string
  startedAt: number
  finishedAt: number
  exercises: LoggedExercise[]
  feeling: Feeling | null
  note: string
}

export interface CardioLog {
  id: string
  date: string
  week: number
  minutes: number
  targetMin: number
  feeling: Feeling | null
  finishedAt: number
}

/** daily — ежедневный комплекс для осанки, back — «Спина и таз» */
export type ComplexId = 'daily' | 'back'

export interface PostureLog {
  date: string
  completedAt: number
  steps: number
  total: number
  /** Нет поля — ежедневный комплекс (записи до появления второго комплекса) */
  complex?: ComplexId
}

export interface DraftSet {
  weight: string
  reps: string
  done: boolean
}

export interface ActiveSession {
  id: string
  workoutId: WorkoutId
  week: number
  date: string
  startedAt: number
  warmup: boolean[]
  current: number
  exercises: { exerciseId: string; sets: DraftSet[] }[]
  rest: { endsAt: number; total: number; label: string } | null
}

export interface AppState {
  version: 1
  profile: Profile
  settings: Settings
  weights: WeightEntry[]
  workouts: WorkoutLog[]
  cardio: CardioLog[]
  posture: PostureLog[]
  active: ActiveSession | null
}
