import type { DayPlan, WeekPlan, Workout, WorkoutId, WorkoutItem } from '../types'

export const TOTAL_WEEKS = 8

export const WORKOUTS: Record<WorkoutId, Workout> = {
  A: {
    id: 'A',
    title: 'Силовая A',
    focus: 'Присед и горизонтальная тяга',
    minutes: '45–50 мин',
    items: [
      { exerciseId: 'goblet_squat', sets: 3, reps: [10, 12], restSec: 90 },
      { exerciseId: 'one_arm_row', sets: 3, reps: [10, 12], restSec: 60 },
      { exerciseId: 'floor_press', sets: 3, reps: [10, 12], restSec: 90 },
      { exerciseId: 'glute_bridge', sets: 2, reps: [12, 15], restSec: 60 },
      { exerciseId: 'rear_delt_fly', sets: 3, reps: [12, 15], restSec: 60 },
      {
        exerciseId: 'dead_bug',
        sets: 2,
        reps: [6, 8],
        restSec: 45,
        repsFrom: [{ week: 3, reps: [8, 10] }],
      },
      { exerciseId: 'triceps_ext', sets: 2, reps: [10, 12], restSec: 60 },
    ],
  },
  B: {
    id: 'B',
    title: 'Силовая B',
    focus: 'Наклон и вертикальный жим',
    minutes: '45–50 мин',
    items: [
      { exerciseId: 'rdl', sets: 3, reps: [10, 12], restSec: 90 },
      { exerciseId: 'overhead_press', sets: 3, reps: [8, 10], restSec: 90 },
      { exerciseId: 'bent_row', sets: 3, reps: [10, 12], restSec: 75 },
      { exerciseId: 'glute_bridge', sets: 3, reps: [12, 15], restSec: 60 },
      { exerciseId: 'rear_delt_fly', sets: 2, reps: [12, 15], restSec: 60 },
      { exerciseId: 'biceps_curl', sets: 2, reps: [10, 12], restSec: 60 },
      {
        exerciseId: 'bird_dog',
        sets: 2,
        reps: [6, 8],
        restSec: 45,
        repsFrom: [{ week: 3, reps: [8, 10] }],
      },
      { exerciseId: 'triceps_ext', sets: 2, reps: [10, 12], restSec: 60 },
    ],
  },
  C: {
    id: 'C',
    title: 'Силовая C',
    focus: 'Смешанная, больше повторений',
    minutes: '45–50 мин',
    items: [
      { exerciseId: 'goblet_squat', sets: 3, reps: [12, 15], restSec: 90 },
      { exerciseId: 'floor_press', sets: 3, reps: [10, 12], restSec: 90 },
      { exerciseId: 'one_arm_row', sets: 3, reps: [12, 15], restSec: 60 },
      { exerciseId: 'rdl', sets: 2, reps: [12, 15], restSec: 90 },
      { exerciseId: 'rear_delt_fly', sets: 3, reps: [12, 15], restSec: 60 },
      { exerciseId: 'biceps_curl', sets: 2, reps: [10, 12], restSec: 60 },
      {
        exerciseId: 'dead_bug',
        sets: 2,
        reps: [8, 8],
        restSec: 45,
        repsFrom: [{ week: 3, reps: [8, 10] }],
      },
    ],
  },
}

export const WEEKS: WeekPlan[] = [
  {
    n: 1,
    phase: 'Освоение',
    rir: '3',
    summary: 'Техника и подбор весов',
    details:
      'На подход меньше, чем в программе (но не меньше двух). Выбирай вес, с которым остаётся 3 чистых повторения в запасе. Цель недели — уверенная техника, а не усталость.',
    setsDelta: -1,
    firstExerciseBonus: false,
    cardioMin: 15,
  },
  {
    n: 2,
    phase: 'Освоение',
    rir: '3',
    summary: 'Полный объём, те же веса',
    details: 'Все подходы по программе. Веса первой недели, запас 3 повторения.',
    setsDelta: 0,
    firstExerciseBonus: false,
    cardioMin: 18,
  },
  {
    n: 3,
    phase: 'Прогрессия',
    rir: '2–3',
    summary: 'Двойная прогрессия',
    details:
      'Сначала добавляй повторения до верхней границы диапазона. Когда во всех подходах верхняя граница выполнена с запасом 2 — в следующий раз добавь вес (+1–2 кг или ближайший шаг гантели).',
    setsDelta: 0,
    firstExerciseBonus: false,
    cardioMin: 20,
  },
  {
    n: 4,
    phase: 'Облегчённая',
    rir: '3–4',
    summary: 'Восстановление',
    details:
      'На подход меньше, веса прошлой недели, запас 3–4 повторения. Облегчённая неделя помогает восстановиться и закрепить технику.',
    setsDelta: -1,
    firstExerciseBonus: false,
    cardioMin: 20,
  },
  {
    n: 5,
    phase: 'Темп',
    rir: '2',
    summary: 'Медленное опускание 3 с',
    details:
      'Опускание за 3 секунды, пауза 1 с, подъём за 1 с (темп 3-1-1). Тот же вес ощущается тяжелее — это способ прогрессировать без новых дисков.',
    setsDelta: 0,
    firstExerciseBonus: false,
    cardioMin: 23,
  },
  {
    n: 6,
    phase: 'Паузы',
    rir: '2',
    summary: 'Паузы в трудной точке',
    details:
      'Паузы 1–2 с в самой трудной точке: внизу приседа, у пояса в тягах, вверху мостика. Смотри подсказку в каждом упражнении.',
    setsDelta: 0,
    firstExerciseBonus: false,
    cardioMin: 25,
  },
  {
    n: 7,
    phase: 'Усложнение',
    rir: '1–2',
    summary: 'Сложные варианты при упоре в вес',
    details:
      '+1 подход в первом упражнении тренировки. Если вес гантелей уже максимальный и верхняя граница повторений выполняется — переходи на вариант из подсказки упражнения (1,5 повтора, разноимённая стойка, мостик на одной ноге).',
    setsDelta: 0,
    firstExerciseBonus: true,
    cardioMin: 28,
  },
  {
    n: 8,
    phase: 'Закрепление',
    rir: '2',
    summary: 'Контрольная неделя',
    details:
      'Обычный объём, запас 2 повторения. Сравни рабочие веса и повторения с 3-й неделей на экране «Прогресс». Дальше можно повторить цикл с новыми стартовыми весами.',
    setsDelta: 0,
    firstExerciseBonus: false,
    cardioMin: 30,
  },
]

export const SCHEDULE: DayPlan[] = [
  { weekday: 0, kind: 'strength', workoutId: 'A', title: 'Силовая A', note: 'Присед и тяга' },
  { weekday: 1, kind: 'cardio', title: 'Степпер', note: 'Умеренное кардио' },
  { weekday: 2, kind: 'strength', workoutId: 'B', title: 'Силовая B', note: 'Наклон и жим стоя' },
  { weekday: 3, kind: 'rest', title: 'Отдых', note: 'Прогулка по желанию' },
  { weekday: 4, kind: 'strength', workoutId: 'C', title: 'Силовая C', note: 'Смешанная' },
  { weekday: 5, kind: 'cardio', title: 'Степпер', note: 'Умеренное кардио' },
  { weekday: 6, kind: 'rest', title: 'Отдых', note: 'Полное восстановление' },
]

export const WARMUP = [
  'Степпер или ходьба на месте — 3 мин, лёгкий темп',
  'Кошка-корова — 6 медленных циклов',
  'Ягодичный мостик без веса — 10',
  'Приседания без веса — 8',
  'Мягкие круги плечами назад — 10',
  'Разминочный подход первого упражнения: половина веса × 8',
]

export const CARDIO_RULES = [
  'Интенсивность 5–6 из 10: дыхание учащённое, но можно говорить фразами.',
  'Первые 3 минуты — лёгкий темп, последние 2 — заминка.',
  'Увеличивай время, только если прошлое занятие перенёс хорошо: нет боли в коленях и голеностопах, на следующий день нет выраженной усталости. Иначе повтори прошлую длительность.',
  'Интенсивное кардио в программу не входит. Кардио — 2 раза в неделю, между ними дни силовых и отдыха.',
]

export const STEPPER_TECHNIQUE = [
  'Корпус вертикально или с лёгким наклоном вперёд, взгляд вперёд, плечи расслаблены.',
  'Вся стопа на педали, колени идут по направлению носков.',
  'Не нависай на руках и не сутулься — это тоже тренировка осанки.',
  'Шаг ровный и тихий, без провалов педали до упора.',
]

/** Когда собирать штангу: те же диски, поэтому выбор — про удобство и вместимость грифа, а не про больший вес */
export const BARBELL_NOTES = [
  'Гантели и штанга собираются из одних и тех же дисков: штанга — это все ~20 кг на одном грифе. Тяжелее двух гантелей она не становится.',
  'Мостик: на гриф помещается весь вес — больше, чем на одну гантель. Когда гантели на тазу станет мало, переходи на штангу.',
  'Румынская тяга, тяга в наклоне, жим на полу: со штангой проще держать траекторию — выбирай то, что удобнее. Жим гантелями нейтральным хватом мягче для плеч.',
  'Присед и жим стоя оставь с гантелями: без стоек штангу на плечи пришлось бы забрасывать рывком — новичку это лишний риск.',
  'Чтобы не пересобирать снаряд много раз, делай упражнения со штангой подряд: порядок можно менять, нажимая номера упражнений вверху экрана тренировки. Диски меняй во время отдыха.',
]

export const BARBELL_IDS = ['bb_bridge', 'bb_rdl', 'bb_row', 'bb_floor_press']

export const SAFETY = [
  'Если есть заболевания сердца, повышенное давление, проблемы с суставами или ты принимаешь лекарства — перед началом программы проконсультируйся с врачом.',
  'Резкое снижение веса на фоне стресса — повод обсудить самочувствие с врачом. Для сохранения мышц не ускоряй снижение: ориентир 0,5–0,75 кг в неделю.',
  'Остановись при боли в груди, выраженной одышке, головокружении, острой боли в суставах или спине.',
  'Мышечная усталость и умеренная крепатура — нормально. Острая, простреливающая боль, онемение — нет.',
]

// ---------- Вычисления ----------

export function weekPlan(week: number): WeekPlan {
  const i = Math.min(Math.max(week, 1), TOTAL_WEEKS) - 1
  return WEEKS[i]
}

export function setsFor(item: WorkoutItem, index: number, week: number): number {
  const w = weekPlan(week)
  let sets = item.sets + w.setsDelta
  if (w.setsDelta < 0) sets = Math.max(2, sets)
  if (w.firstExerciseBonus && index === 0) sets += 1
  return sets
}

export function repsFor(item: WorkoutItem, week: number): [number, number] {
  let reps = item.reps
  for (const r of item.repsFrom ?? []) if (week >= r.week) reps = r.reps
  return reps
}

export function repsLabel(r: [number, number]): string {
  return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`
}

export function dayPlan(weekday: number): DayPlan {
  return SCHEDULE[weekday]
}
