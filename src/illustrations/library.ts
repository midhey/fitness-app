import type { MuscleId } from '../types'
import type { Prop } from './draw'
import type { FrontPose, Pair, SidePose } from './rig'

export type JointName = 'handN' | 'handF' | 'elbowN' | 'footN' | 'footF' | 'head' | 'P' | 'handR'

export type FigureSpec =
  | {
      rig: 'side'
      keys: SidePose[]
      transform?: string
      muscles: MuscleId[]
      props?: Prop[]
      pedals?: boolean
      /** Подсвечивать только ближние конечности */
      nearOnly?: boolean
      trace?: { joint: JointName; from: number; to: number }
      overlay?: Prop[]
    }
  | {
      rig: 'front'
      view: 'front' | 'back' | 'top'
      /** Подсвечивать мышцы только одной стороны (L — слева от зрителя) */
      muscleSide?: 'L' | 'R'
      keys: FrontPose[]
      transform?: string
      muscles: MuscleId[]
      props?: Prop[]
      trace?: { joint: JointName; from: number; to: number }
      overlay?: Prop[]
    }

export interface Illustration {
  id: string
  view: string
  /** [пауза в позе 0, переход 0→1, пауза в позе 1, переход 1→2, …] в секундах; последний переход — к позе 0 */
  timeline: number[]
  props: Prop[]
  figures: FigureSpec[]
  phases: { label: string; key: number }[]
  note?: string
}

// ---------- базовые позы ----------

const ANKLE_N: [number, number] = [154, 207]
const ANKLE_F: [number, number] = [148, 207]

function stand(o: Partial<SidePose> = {}): SidePose {
  return {
    p: [150, 132],
    torso: 0,
    neck: 0,
    armN: { a: 4, b: 8 },
    armF: { a: 2, b: 8 },
    legN: { ik: ANKLE_N },
    legF: { ik: ANKLE_F },
    footN: 90,
    footF: 90,
    ...o,
  }
}

/** Лёжа на спине, голова слева, колени согнуты, стопы на полу */
function supine(o: Partial<SidePose> = {}): SidePose {
  return {
    p: [182, 196],
    torso: -90,
    neck: 0,
    armN: { a: 84, b: 0 },
    armF: { a: 84, b: 0 },
    legN: { ik: [228, 203] },
    legF: { ik: [224, 203] },
    footN: 90,
    footF: 90,
    ...o,
  }
}

/** На четвереньках, голова справа */
function quad(o: Partial<SidePose> = {}): SidePose {
  return {
    p: [130, 164],
    torso: 75,
    neck: 0,
    armN: { a: 0, b: 0 },
    armF: { a: 0, b: 0 },
    legN: { a: 0, b: 90 },
    legF: { a: 0, b: 90 },
    footN: -80,
    footF: -80,
    ...o,
  }
}

const FLOOR: Prop = { type: 'floor' }

// ---------- силовые ----------

const goblet: Illustration = {
  id: 'goblet_squat',
  view: 'Вид сбоку',
  timeline: [0.6, 1.6, 0.5, 1.3],
  props: [FLOOR],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Низ', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['quads', 'glutes'],
      trace: { joint: 'P', from: 0, to: 1 },
      keys: [
        stand({
          torso: 4,
          armN: { a: 20, b: 140 },
          armF: { a: 17, b: 140 },
          dbN: { kind: 'bar', angle: 0, off: [2, 8] },
        }),
        stand({
          p: [131, 171],
          torso: 30,
          neck: -16,
          armN: { a: 42, b: 134 },
          armF: { a: 39, b: 134 },
          dbN: { kind: 'bar', angle: 0, off: [2, 8] },
        }),
      ],
    },
  ],
}

const oneArmRow: Illustration = {
  id: 'one_arm_row',
  view: 'Вид сбоку · опора — стул или диван',
  timeline: [0.5, 1.2, 0.5, 1.6],
  props: [FLOOR, { type: 'chair', x: 168, y: 178, w: 48 }],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Тяга', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['lats', 'upperBack', 'rearDelts', 'biceps'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        {
          p: [122, 140],
          torso: 72,
          neck: 0,
          armN: { a: 2, b: 4 },
          armF: { ik: [184, 174] },
          legN: { ik: [92, 207] },
          legF: { ik: [150, 207] },
          footN: 90,
          footF: 90,
          dbN: { kind: 'bar' },
        },
        {
          p: [122, 140],
          torso: 72,
          neck: 0,
          armN: { a: -112, b: 110 },
          armF: { ik: [184, 174] },
          legN: { ik: [92, 207] },
          legF: { ik: [150, 207] },
          footN: 90,
          footF: 90,
          dbN: { kind: 'bar' },
        },
      ],
    },
  ],
}

const bentRowPose = (arms: { a: number; b: number }): SidePose => ({
  p: [126, 140],
  torso: 55,
  neck: 0,
  armN: arms,
  armF: { a: arms.a - 2, b: arms.b },
  legN: { ik: [152, 207] },
  legF: { ik: [147, 207] },
  footN: 90,
  footF: 90,
  dbN: { kind: 'bar' },
  dbF: { kind: 'bar' },
})

const bentRow: Illustration = {
  id: 'bent_row',
  view: 'Вид сбоку',
  timeline: [0.5, 1.2, 0.5, 1.6],
  props: [FLOOR],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Тяга', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['lats', 'upperBack', 'rearDelts'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [bentRowPose({ a: 1, b: 2 }), bentRowPose({ a: -84, b: 84 })],
    },
  ],
}

const floorPress: Illustration = {
  id: 'floor_press',
  view: 'Вид сбоку · лёжа на коврике',
  timeline: [0.5, 1.8, 0.4, 1.2],
  props: [FLOOR, { type: 'mat', x0: 70, x1: 262 }],
  phases: [
    { label: 'Верх', key: 0 },
    { label: 'Низ', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['chest', 'triceps', 'frontDelts'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        supine({
          armN: { pt: [2, -26, 4, -51] },
          armF: { pt: [0, -26, 2, -51] },
          dbN: { kind: 'bar', angle: 90 },
          dbF: { kind: 'bar', angle: 90 },
        }),
        supine({
          armN: { pt: [12, 7, 13, -17] },
          armF: { pt: [10, 7, 11, -17] },
          dbN: { kind: 'bar', angle: 90 },
          dbF: { kind: 'bar', angle: 90 },
        }),
      ],
    },
  ],
}

const rdl: Illustration = {
  id: 'rdl',
  view: 'Вид сбоку',
  timeline: [0.5, 1.9, 0.5, 1.4],
  props: [FLOOR],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Низ', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['hamstrings', 'glutes', 'erectors'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        stand({
          armN: { a: 10, b: 0 },
          armF: { a: 8, b: 0 },
          dbN: { kind: 'end' },
          dbF: { kind: 'end' },
        }),
        stand({
          p: [118, 142],
          torso: 75,
          armN: { a: 1, b: 0 },
          armF: { a: -1, b: 0 },
          dbN: { kind: 'end' },
          dbF: { kind: 'end' },
        }),
      ],
    },
  ],
}

const bridge: Illustration = {
  id: 'glute_bridge',
  view: 'Вид сбоку · лёжа на коврике',
  timeline: [0.5, 1.2, 1.0, 1.4],
  props: [FLOOR, { type: 'mat', x0: 70, x1: 262 }],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Верх', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['glutes', 'hamstrings'],
      trace: { joint: 'P', from: 0, to: 1 },
      keys: [supine({ p: [178, 196], torso: -90 }), supine({ p: [176, 174], torso: -120, neck: 30 })],
    },
  ],
}

const ohp: Illustration = {
  id: 'overhead_press',
  view: 'Вид сбоку',
  timeline: [0.5, 1.2, 0.5, 1.6],
  props: [FLOOR],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Верх', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['frontDelts', 'sideDelts', 'triceps'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        stand({
          armN: { ik: [157, 87] },
          armF: { ik: [155, 87] },
          dbN: { kind: 'bar' },
          dbF: { kind: 'bar' },
        }),
        stand({
          armN: { ik: [155, 35] },
          armF: { ik: [153, 35] },
          dbN: { kind: 'bar' },
          dbF: { kind: 'bar' },
        }),
      ],
    },
  ],
}

const hinge: SidePose = bentRowPose({ a: 1, b: 2 })

const rearDelt: Illustration = {
  id: 'rear_delt_fly',
  view: 'Вид сзади · корпус наклонён',
  timeline: [0.5, 1.2, 0.6, 1.6],
  props: [FLOOR, { type: 'label', x: 12, y: 128, text: 'наклон ≈ 45°' }],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Верх', key: 1 },
  ],
  figures: [
    {
      rig: 'front',
      view: 'back',
      muscles: ['rearDelts', 'upperBack', 'lowerTraps'],
      trace: { joint: 'handR', from: 0, to: 1 },
      keys: [
        {
          c: [178, 133],
          lt: 25,
          headDy: 9,
          armL: { a: 4, b: -4 },
          armR: { a: 4, b: -4 },
          legL: { a: 5, b: -5 },
          legR: { a: 5, b: -5 },
          dbL: { kind: 'end' },
          dbR: { kind: 'end' },
        },
        {
          c: [178, 133],
          lt: 25,
          headDy: 9,
          armL: { a: 80, b: -12 },
          armR: { a: 80, b: -12 },
          legL: { a: 5, b: -5 },
          legR: { a: 5, b: -5 },
          dbL: { kind: 'end' },
          dbR: { kind: 'end' },
        },
      ],
    },
    {
      rig: 'side',
      muscles: [],
      transform: 'translate(-22 14) scale(0.45)',
      props: [{ type: 'floor' }],
      keys: [hinge],
    },
  ],
}

const curls: Illustration = {
  id: 'biceps_curl',
  view: 'Вид сбоку',
  timeline: [0.4, 1.1, 0.4, 1.8],
  props: [FLOOR],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Верх', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['biceps', 'forearms'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        stand({ armN: { a: 4, b: 6 }, armF: { a: 2, b: 6 }, dbN: { kind: 'end' }, dbF: { kind: 'end' } }),
        stand({ armN: { a: 10, b: 138 }, armF: { a: 8, b: 138 }, dbN: { kind: 'end' }, dbF: { kind: 'end' } }),
      ],
    },
  ],
}

const deadBugStart = (): SidePose => ({
  p: [184, 196],
  torso: -90,
  neck: 0,
  armN: { a: 180, b: 0 },
  armF: { a: 178, b: 0 },
  legN: { a: 180, b: 90 },
  legF: { a: 178, b: 90 },
})

const deadBug: Illustration = {
  id: 'dead_bug',
  view: 'Вид сбоку · затем другая сторона',
  timeline: [0.6, 1.8, 0.6, 1.8],
  props: [FLOOR, { type: 'mat', x0: 48, x1: 290 }],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Вытянуть', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['core', 'obliques'],
      keys: [deadBugStart(), { ...deadBugStart(), armN: { a: -98, b: 0 }, legF: { a: 100, b: 6 } }],
    },
  ],
}

const birdDogPoses: SidePose[] = [quad(), quad({ armN: { a: 88, b: 0 }, legF: { a: -88, b: 0 }, footF: 0 })]

const birdDog: Illustration = {
  id: 'bird_dog',
  view: 'Вид сбоку · затем другая сторона',
  timeline: [0.6, 1.4, 1.6, 1.4],
  props: [FLOOR, { type: 'mat', x0: 40, x1: 262 }],
  phases: [
    { label: 'Старт', key: 0 },
    { label: 'Удержание', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['erectors', 'glutes', 'core'],
      keys: birdDogPoses,
    },
  ],
}

// ---------- осанка ----------

const chinTuck: Illustration = {
  id: 'chin_tuck',
  view: 'Вид сбоку · крупно',
  timeline: [0.8, 1.2, 2.2, 1.2],
  props: [],
  phases: [
    { label: 'Исходно', key: 0 },
    { label: 'Назад', key: 1 },
  ],
  note: 'Пунктир — вертикаль через плечевой сустав',
  figures: [
    {
      rig: 'side',
      muscles: ['neckFlexors'],
      transform: 'translate(-125 -19) scale(1.9)',
      overlay: [{ type: 'plumb', x: 150, y0: 44, y1: 150 }],
      trace: { joint: 'head', from: 0, to: 1 },
      keys: [
        stand({ neck: 24, tilt: -24, headX: 2, armN: { a: 3, b: 8 } }),
        stand({ neck: 0, tilt: 5, headX: -2.5, armN: { a: 3, b: 8 } }),
      ],
    },
  ],
}

/** Вид спереди: человек в дверном проёме, правое предплечье на косяке */
const doorFront = (o: Partial<FrontPose> = {}): FrontPose => ({
  c: [156, 131],
  armL: { a: 8, b: 4 },
  armR: { a: 6, b: 4 },
  legL: { a: 5, b: -5 },
  legR: { a: 5, b: -5 },
  hl: 0,
  ...o,
})

/** Вид сбоку (врезка): косяк x=160; сначала тело за линией проёма, затем шаг вперёд */
const doorSide = (p: Pair, arm: [number, number, number, number], near: Pair, far: Pair, hl: number): SidePose =>
  stand({ p, armN: { pt: arm }, armF: { a: 3, b: 8 }, legN: { ik: near }, legF: { ik: far }, hl })

const doorway: Illustration = {
  id: 'doorway_stretch',
  view: 'Спереди и сбоку',
  timeline: [0.6, 1.2, 0.5, 1.6, 2.8, 1.4],
  props: [
    FLOOR,
    { type: 'doorFront', x0: 116, x1: 180, top: 44 },
    { type: 'panel', x: 222, y: 20, w: 90, h: 122 },
    { type: 'label', x: 267, y: 136, text: 'шаг вперёд', anchor: 'middle' },
  ],
  phases: [
    { label: 'На косяк', key: 1 },
    { label: 'Шаг вперёд', key: 2 },
  ],
  note: 'Тянется передняя поверхность груди и плеча',
  figures: [
    {
      rig: 'front',
      view: 'front',
      muscles: ['chest', 'frontDelts'],
      muscleSide: 'L',
      keys: [doorFront(), doorFront({ armL: { a: 84, b: 96 }, hl: 0.25 }), doorFront({ armL: { a: 84, b: 96 }, hl: 1, s: 1.05 })],
    },
    {
      rig: 'side',
      muscles: ['chest', 'frontDelts'],
      transform: 'translate(187 14) scale(0.5)',
      props: [
        { type: 'post', x: 160, w: 9, y0: 40 },
        { type: 'hline', x0: 104, x1: 216, y: 212 },
      ],
      keys: [
        doorSide([146, 132], [16, 4, 16, -21], [149, 207], [144, 207], 0.25),
        doorSide([146, 132], [16, 4, 16, -21], [149, 207], [144, 207], 0.25),
        doorSide([173, 135], [-12.6, 1, -12.6, -24], [190, 207], [150, 207], 1),
      ],
    },
  ],
}

const catCow: Illustration = {
  id: 'cat_cow',
  view: 'Вид сбоку',
  timeline: [0.3, 1.7, 0.6, 1.7, 0.3, 1.7, 0.6, 1.7],
  props: [FLOOR, { type: 'mat', x0: 50, x1: 262 }],
  phases: [
    { label: 'Корова · вдох', key: 1 },
    { label: 'Кошка · выдох', key: 3 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['erectors', 'core'],
      keys: [quad(), quad({ spine: -13, neck: -14 }), quad(), quad({ spine: 17, neck: 34 })],
    },
  ],
}

const rot = (elbow: [number, number], hand: [number, number], face: number): SidePose => ({
  p: [120, 168],
  torso: 70,
  neck: 0,
  face,
  armN: { pt: [elbow[0], elbow[1], hand[0], hand[1]] },
  armF: { ik: [168, 204] },
  legN: { a: 26, b: 116 },
  legF: { a: 26, b: 116 },
  footN: -84,
  footF: -84,
})

const thoracic: Illustration = {
  id: 'thoracic_rotation',
  view: 'Вид сбоку · таз отведён к пяткам',
  timeline: [0.5, 1.8, 0.9, 1.8],
  props: [FLOOR, { type: 'mat', x0: 50, x1: 262 }],
  phases: [
    { label: 'Локоть вниз', key: 0 },
    { label: 'Локоть вверх', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['upperBack', 'obliques'],
      trace: { joint: 'elbowN', from: 0, to: 1 },
      keys: [rot([14, 10], [13, -14], 20), rot([4, -27], [11, -15], 175)],
    },
  ],
}

const wallSlides: Illustration = {
  id: 'wall_slides',
  view: 'Вид спереди · спина у стены',
  timeline: [0.6, 2.0, 1.2, 2.0],
  props: [FLOOR, { type: 'wallBack', x0: 58, x1: 262, y0: 12 }],
  phases: [
    { label: '«W»', key: 0 },
    { label: '«Y»', key: 1 },
  ],
  figures: [
    {
      rig: 'front',
      view: 'front',
      muscles: ['serratus', 'sideDelts'],
      trace: { joint: 'handR', from: 0, to: 1 },
      keys: [
        {
          c: [160, 131],
          armL: { a: 78, b: 102 },
          armR: { a: 78, b: 102 },
          legL: { a: 5, b: -5 },
          legR: { a: 5, b: -5 },
        },
        {
          c: [160, 131],
          armL: { a: 148, b: 12 },
          armR: { a: 148, b: 12 },
          legL: { a: 5, b: -5 },
          legR: { a: 5, b: -5 },
        },
      ],
    },
  ],
}

const ytPose = (a: number, lift: number): FrontPose => ({
  c: [0, 0],
  armL: { a, b: 0 },
  armR: { a, b: 0 },
  legL: { a: 3, b: -3 },
  legR: { a: 3, b: -3 },
  liftL: lift,
  liftR: lift,
})

const ytRaises: Illustration = {
  id: 'yt_raises',
  view: 'Вид сверху · лёжа на животе',
  timeline: [0.5, 0.7, 1.6, 0.7, 0.4, 1.1, 0.5, 0.7, 1.6, 0.7, 0.4, 1.1],
  props: [
    { type: 'matTop', x: 50, y: 34, w: 222, h: 176 },
    { type: 'towel', x: 204, y: 108, w: 30, h: 28 },
  ],
  phases: [
    { label: 'Y', key: 1 },
    { label: 'T', key: 4 },
  ],
  note: 'Руки поднимаются всего на 2–5 см — тень показывает подъём',
  figures: [
    {
      rig: 'front',
      view: 'top',
      muscles: ['lowerTraps', 'upperBack', 'rearDelts'],
      transform: 'translate(150 122) rotate(90)',
      keys: [ytPose(145, 0), ytPose(145, 1), ytPose(145, 0), ytPose(90, 0), ytPose(90, 1), ytPose(90, 0)],
    },
  ],
}

const stepper: Illustration = {
  id: 'stepper',
  view: 'Вид сбоку · степпер',
  timeline: [0.05, 0.75, 0.05, 0.75],
  props: [FLOOR, { type: 'stepperBase', x: 122, w: 62 }],
  phases: [
    { label: 'Шаг', key: 0 },
    { label: 'Шаг', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['quads', 'glutes', 'calves'],
      pedals: true,
      keys: [
        stand({
          p: [150, 122],
          torso: 5,
          armN: { a: 14, b: 32 },
          armF: { a: -10, b: 32 },
          legN: { ik: [156, 180] },
          legF: { ik: [150, 193] },
        }),
        stand({
          p: [150, 122],
          torso: 5,
          armN: { a: -10, b: 32 },
          armF: { a: 14, b: 32 },
          legN: { ik: [156, 193] },
          legF: { ik: [150, 180] },
        }),
      ],
    },
  ],
}

// ---------- варианты со штангой ----------

/** Тот же рисунок, но в руках штанга, видимая с торца (обе кисти на одном грифе) */
function barbellVersion(base: Illustration, id: string, view: string): Illustration {
  return {
    ...base,
    id,
    view,
    figures: base.figures.map((f) =>
      f.rig === 'side' && !f.transform
        ? { ...f, keys: f.keys.map((k) => ({ ...k, armF: k.armN, dbN: { kind: 'barbell' as const }, dbF: undefined })) }
        : f,
    ),
  }
}

const bbRdl = barbellVersion(rdl, 'bb_rdl', 'Вид сбоку · штанга')
const bbRow = barbellVersion(bentRow, 'bb_row', 'Вид сбоку · штанга')
const bbFloorPress = barbellVersion(floorPress, 'bb_floor_press', 'Вид сбоку · штанга, лёжа на коврике')

const bbBridge: Illustration = {
  ...bridge,
  id: 'bb_bridge',
  view: 'Вид сбоку · штанга на тазу',
  figures: [
    {
      rig: 'side',
      muscles: ['glutes', 'hamstrings'],
      trace: { joint: 'P', from: 0, to: 1 },
      keys: [
        supine({
          p: [178, 196],
          torso: -90,
          armN: { ik: [176, 183] },
          armF: { ik: [174, 183] },
          dbN: { kind: 'barbell', off: [1, -3] },
        }),
        supine({
          p: [176, 174],
          torso: -120,
          neck: 30,
          armN: { ik: [168, 161] },
          armF: { ik: [166, 161] },
          dbN: { kind: 'barbell', off: [1, -3] },
        }),
      ],
    },
  ],
}

// ---------- комплекс «Спина и таз» ----------

const pelvicTilt: Illustration = {
  id: 'pelvic_tilt',
  view: 'Вид сбоку · лёжа на спине',
  timeline: [0.6, 1.4, 1.8, 1.4],
  props: [FLOOR, { type: 'mat', x0: 70, x1: 262 }],
  phases: [
    { label: 'Обычно', key: 0 },
    { label: 'Таз подкручен', key: 1 },
  ],
  note: 'Просвет под поясницей уходит за счёт мышц живота и ягодиц — таз от пола не отрывается',
  figures: [
    {
      rig: 'side',
      muscles: ['core', 'glutes'],
      // руки скрещены на груди, чтобы было видно поясницу
      keys: [
        supine({ spine: -9, armN: { pt: [16, -14, 2, -9] }, armF: { pt: [15, -14, 1, -9] }, hl: 0.25 }),
        supine({ spine: 1.5, armN: { pt: [16, -14, 2, -9] }, armF: { pt: [15, -14, 1, -9] }, hl: 1 }),
      ],
    },
  ],
}

const hipKnee = (p: Pair, thigh: number, knee: number, hl: number): SidePose => ({
  p,
  torso: 0,
  neck: 0,
  armN: { a: 3, b: 10 },
  armF: { a: 1, b: 10 },
  legN: { a: thigh, b: knee },
  legF: { ik: [194, 206] },
  footN: -90,
  footF: 90,
  hl,
})

const hipFlexor: Illustration = {
  id: 'hip_flexor_stretch',
  view: 'Вид сбоку · колено на сложенном коврике',
  timeline: [0.6, 1.6, 2.6, 1.4],
  props: [FLOOR, { type: 'mat', x0: 84, x1: 236 }],
  phases: [
    { label: 'Полувыпад', key: 0 },
    { label: 'Таз вперёд', key: 1 },
  ],
  note: 'Тянется передняя поверхность бедра той ноги, что стоит на колене',
  figures: [
    {
      rig: 'side',
      muscles: ['hipFlexors', 'quads'],
      nearOnly: true,
      keys: [hipKnee([152, 166], -18.4, 69.6, 0.3), hipKnee([159, 169], -30, 58, 1)],
    },
  ],
}

const towelPose = (torso: number, spine: number, neck: number, arm: [number, number, number, number], hl: number): SidePose =>
  supine({
    p: [184, 196],
    torso,
    spine,
    neck,
    armN: { pt: arm },
    armF: { pt: [arm[0] - 1, arm[1], arm[2] - 1, arm[3]] },
    legN: { ik: [230, 203] },
    legF: { ik: [226, 203] },
    hl,
  })

const towelThoracic: Illustration = {
  id: 'towel_thoracic',
  view: 'Вид сбоку · валик под лопатками',
  timeline: [0.6, 1.8, 1.2, 1.6],
  props: [FLOOR, { type: 'mat', x0: 70, x1: 262 }],
  phases: [
    { label: 'Исходно', key: 0 },
    { label: 'Раскрытие', key: 1 },
  ],
  note: 'Двигается грудной отдел над валиком; таз и поясница остаются на полу',
  figures: [
    {
      rig: 'side',
      muscles: ['upperBack'],
      // торец валика виден сбоку от тела — рисуем поверх корпуса
      overlay: [{ type: 'roll', x: 153, y: 203, r: 5 }],
      keys: [towelPose(-84, 0, 0, [-6, -17, -17.9, 7.1], 0.3), towelPose(-93, -5, 10, [-6, -12, -18.1, 5.6], 1)],
    },
  ],
}

const latPose = (p: Pair, torso: number, spine: number, hl: number): SidePose =>
  stand({
    p,
    torso,
    spine,
    armN: { ik: [222, 148] },
    armF: { ik: [220, 148] },
    legN: { ik: [152, 207] },
    legF: { ik: [147, 207] },
    hl,
  })

const latStretch: Illustration = {
  id: 'lat_stretch',
  view: 'Вид сбоку · опора — стол или подоконник',
  timeline: [0.6, 1.8, 2.4, 1.6],
  props: [FLOOR, { type: 'chair', x: 214, y: 150, w: 48 }],
  phases: [
    { label: 'Наклон', key: 0 },
    { label: 'Растяжение', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['lats'],
      keys: [latPose([142, 136], 62, 0, 0.3), latPose([128, 140], 84, -3, 1)],
    },
  ],
}

const supineChin: Illustration = {
  id: 'supine_chin_tuck',
  view: 'Вид сбоку · крупно, лёжа',
  timeline: [0.8, 1.2, 2.6, 1.2],
  props: [],
  phases: [
    { label: 'Исходно', key: 0 },
    { label: 'Кивок', key: 1 },
  ],
  note: 'Мягкий кивок: подбородок к груди, затылок скользит по полу — голова от пола не отрывается',
  figures: [
    {
      rig: 'side',
      muscles: ['neckFlexors'],
      transform: 'translate(-133 -340) scale(2.4)',
      props: [FLOOR, { type: 'mat', x0: 40, x1: 280 }],
      keys: [supine({ tilt: -4, hl: 0.3 }), supine({ tilt: 16, hl: 1 })],
    },
  ],
}

const childPose = (p: Pair, torso: number, spine: number, thigh: number, knee: number, hl: number): SidePose => ({
  p,
  torso,
  spine,
  neck: 10,
  armN: { ik: [229, 203] },
  armF: { ik: [227, 203] },
  legN: { a: thigh, b: knee },
  legF: { a: thigh, b: knee },
  footN: -90,
  footF: -90,
  hl,
})

const childsPose: Illustration = {
  id: 'childs_pose',
  view: 'Вид сбоку · колени шире таза',
  timeline: [0.4, 2.8, 0.6, 3.2],
  props: [FLOOR, { type: 'mat', x0: 84, x1: 262 }],
  phases: [
    { label: 'Вдох', key: 0 },
    { label: 'Выдох', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['erectors', 'lats'],
      keys: [childPose([134, 184], 97, 4, 62, 149.2, 0.5), childPose([133.3, 186.5], 99, 6, 65.9, 153.1, 1)],
    },
  ],
}

// ---------- ротация «Спина и таз»: дополнительные упражнения ----------

const MAT_SUPINE: Prop = { type: 'mat', x0: 70, x1: 262 }

/** Точка конечности по прямой кинематике (для расчёта захвата руками) */
const along = (from: Pair, deg: number, length: number): Pair => [
  from[0] + Math.sin((deg * Math.PI) / 180) * length,
  from[1] + Math.cos((deg * Math.PI) / 180) * length,
]

/** Колени у груди: бедро под углом thigh, голень почти горизонтально, кисти на голенях */
const kneesPose = (thigh: number, lift: number, hl: number): SidePose => {
  const p: Pair = [182, 196 - lift]
  const knee = along(p, thigh, 38)
  const hand = along(knee, 95, 9)
  return supine({
    p,
    torso: -90 + lift,
    spine: 0,
    neck: 6,
    armN: { ik: [hand[0], hand[1] + 3] },
    armF: { ik: [hand[0] - 2, hand[1] + 3] },
    legN: { a: thigh, b: thigh + 265 },
    legF: { a: thigh - 3, b: thigh + 262 },
    hl,
  })
}

const kneesToChest: Illustration = {
  id: 'knees_to_chest',
  view: 'Вид сбоку · лёжа на спине',
  timeline: [0.6, 2.0, 1.6, 2.0],
  props: [FLOOR, MAT_SUPINE],
  phases: [
    { label: 'Колени держишь', key: 0 },
    { label: 'Мягко к груди', key: 1 },
  ],
  note: 'Тянут руки, а не мышцы живота: поясница мягко округляется и ложится на коврик',
  figures: [{ rig: 'side', muscles: ['erectors', 'glutes'], keys: [kneesPose(-124, 0, 0.35), kneesPose(-160, 4, 1)] }],
}

const rockPose = (p: Pair, torso: number, thigh: number, hl: number): SidePose =>
  quad({
    p,
    torso,
    spine: 0,
    armN: { ik: [190, 204] },
    armF: { ik: [188, 204] },
    legN: { a: thigh, b: thigh + 90 },
    legF: { a: thigh, b: thigh + 90 },
    hl,
  })

const quadRock: Illustration = {
  id: 'quad_rock',
  view: 'Вид сбоку · на четвереньках',
  timeline: [0.5, 2.0, 0.8, 1.8],
  props: [FLOOR, { type: 'mat', x0: 40, x1: 262 }],
  phases: [
    { label: 'Четвереньки', key: 0 },
    { label: 'Таз к пяткам', key: 1 },
  ],
  note: 'Спина остаётся ровной: двигается таз, а не поясница',
  figures: [{ rig: 'side', muscles: ['glutes', 'erectors'], keys: [rockPose([130, 164], 75, 0, 0.35), rockPose([98, 181], 80, 54, 1)] }],
}

const hamPose = (thigh: number, hl: number): SidePose => {
  const p: Pair = [182, 196]
  const hand = along(p, thigh, 30)
  return supine({
    p,
    spine: 0,
    neck: 4,
    armN: { ik: [Math.min(hand[0], 172), Math.max(hand[1], 158)] },
    armF: { ik: [Math.min(hand[0], 172) - 2, Math.max(hand[1], 158)] },
    legN: { a: thigh, b: 0 },
    legF: { a: 140, b: 100 },
    hl,
  })
}

const hamstringStretch: Illustration = {
  id: 'hamstring_stretch',
  view: 'Вид сбоку · полотенце за стопой',
  timeline: [0.6, 2.2, 2.4, 1.8],
  props: [FLOOR, MAT_SUPINE],
  phases: [
    { label: 'Нога вверх', key: 0 },
    { label: 'Растяжение', key: 1 },
  ],
  note: 'Колено почти прямое, таз и вторая стопа остаются на полу',
  figures: [{ rig: 'side', muscles: ['hamstrings', 'calves'], nearOnly: true, keys: [hamPose(146, 0.35), hamPose(166, 1)] }],
}

/** «Четвёрка»: дальняя нога согнута, лодыжка ближней лежит на её колене */
const figurePose = (farAnkle: Pair, nearAnkle: Pair, hand: Pair, hl: number): SidePose =>
  supine({
    spine: 0,
    neck: 6,
    armN: { ik: hand },
    armF: { ik: [hand[0] - 2, hand[1]] },
    legN: { ik: nearAnkle, bend: -1 },
    legF: { ik: farAnkle },
    footN: 20,
    hl,
  })

const figureFour: Illustration = {
  id: 'figure_four',
  view: 'Вид сбоку · лодыжка на колене',
  timeline: [0.6, 2.2, 2.4, 1.8],
  props: [FLOOR, MAT_SUPINE],
  phases: [
    { label: 'Ноги скрещены', key: 0 },
    { label: 'Бедро к себе', key: 1 },
  ],
  note: 'Тянется ягодица той ноги, что лежит сверху; колено мягко уводи от себя',
  figures: [
    {
      rig: 'side',
      muscles: ['glutes'],
      keys: [figurePose([224, 203], [206, 172], [172, 178], 0.35), figurePose([212, 180], [190, 161], [170, 168], 1)],
    },
  ],
}

const heelPose = (thigh: number, hl: number): SidePose =>
  supine({
    spine: 1,
    armN: { a: 84, b: 0 },
    armF: { a: 84, b: 0 },
    legN: { a: thigh, b: 90 },
    legF: { a: 180, b: 90 },
    footN: thigh - 270,
    footF: -90,
    hl,
  })

const heelTaps: Illustration = {
  id: 'heel_taps',
  view: 'Вид сбоку · затем другая нога',
  timeline: [0.6, 1.8, 0.4, 1.6],
  props: [FLOOR, MAT_SUPINE],
  phases: [
    { label: 'Ноги 90/90', key: 0 },
    { label: 'Пятка к полу', key: 1 },
  ],
  note: 'Поясница прижата к коврику всё время — опускай ногу только до этой границы',
  figures: [{ rig: 'side', muscles: ['core', 'obliques'], nearOnly: true, keys: [heelPose(180, 0.4), heelPose(122, 1)] }],
}

const plankPose = (p: Pair, torso: number, elbow: Pair, hand: Pair, knee: Pair, ankle: Pair, hl: number): SidePose => ({
  p,
  torso,
  spine: 0,
  neck: 0,
  armN: { pt: [elbow[0], elbow[1], hand[0], hand[1]] },
  armF: { pt: [elbow[0] - 2, elbow[1], hand[0] - 2, hand[1]] },
  legN: { pt: [knee[0], knee[1], ankle[0], ankle[1]] },
  legF: { pt: [knee[0] - 2, knee[1], ankle[0] - 2, ankle[1]] },
  footN: -150,
  footF: -150,
  hl,
})

const kneePlank: Illustration = {
  id: 'knee_plank',
  view: 'Вид сбоку · опора на предплечья и колени',
  timeline: [0.6, 1.8, 2.6, 1.6],
  props: [FLOOR, { type: 'mat', x0: 40, x1: 262 }],
  phases: [
    { label: 'Опора', key: 0 },
    { label: 'Прямая линия', key: 1 },
  ],
  note: 'От затылка до колен — одна линия: живот подтянут, ягодицы напряжены, поясница не провисает',
  figures: [
    {
      rig: 'side',
      muscles: ['core', 'glutes'],
      keys: [
        plankPose([122, 176], 100, [4, 22], [28, 23], [-30, 30], [-64, 23], 0.35),
        plankPose([126, 189], 80, [0, 25], [24, 26], [-34, 17], [-68, 10], 1),
      ],
    },
  ],
}

const marchPose = (thigh: number, knee: number, hl: number): SidePose =>
  supine({
    p: [176, 174],
    torso: -120,
    spine: 0,
    neck: 30,
    legN: { a: thigh, b: knee },
    legF: { a: 128, b: 112 },
    hl,
  })

const bridgeMarch: Illustration = {
  id: 'bridge_march',
  view: 'Вид сбоку · таз держится высоко',
  timeline: [0.6, 1.4, 1.2, 1.4],
  props: [FLOOR, MAT_SUPINE],
  phases: [
    { label: 'Мостик', key: 0 },
    { label: 'Колено вверх', key: 1 },
  ],
  note: 'Таз не проседает и не заваливается в сторону, когда стопа отрывается от пола',
  figures: [{ rig: 'side', muscles: ['glutes', 'hamstrings'], keys: [marchPose(132, 115, 0.6), marchPose(178, 88, 1)] }],
}

const hingePose = (p: Pair, torso: number, hl: number): SidePose =>
  stand({
    p,
    torso,
    spine: 0,
    neck: torso > 20 ? -12 : 0,
    armN: { pt: [-4, 14, 8, 30] },
    armF: { pt: [-5, 14, 7, 30] },
    legN: { ik: [154, 207] },
    legF: { ik: [148, 207] },
    hl,
  })

const hipHinge: Illustration = {
  id: 'hip_hinge',
  view: 'Вид сбоку · руки свободно',
  timeline: [0.5, 2.0, 0.8, 1.6],
  props: [FLOOR],
  phases: [
    { label: 'Стоя', key: 0 },
    { label: 'Наклон тазом', key: 1 },
  ],
  note: 'Таз уходит назад, спина прямая, колени слегка согнуты — так поднимают вещи с пола',
  figures: [
    {
      rig: 'side',
      muscles: ['glutes', 'hamstrings'],
      trace: { joint: 'P', from: 0, to: 1 },
      keys: [hingePose([150, 132], 0, 0.35), hingePose([128, 140], 58, 1)],
    },
  ],
}

const breathPose = (spine: number, hl: number): SidePose =>
  supine({
    spine,
    neck: 0,
    armN: { pt: [20, -12, 34, -6] },
    armF: { pt: [19, -12, 33, -6] },
    legN: { a: 180, b: 90 },
    legF: { a: 178, b: 92 },
    footN: -90,
    footF: -90,
    hl,
  })

const breathing9090: Illustration = {
  id: 'breathing_9090',
  view: 'Вид сбоку · голени на стуле',
  timeline: [0.4, 3.2, 0.6, 4.6],
  props: [FLOOR, MAT_SUPINE, { type: 'chair', x: 200, y: 162, w: 52 }],
  phases: [
    { label: 'Вдох', key: 0 },
    { label: 'Выдох', key: 1 },
  ],
  note: 'На выдохе рёбра опускаются, поясница мягко ложится на пол — без усилия ногами',
  figures: [{ rig: 'side', muscles: ['core'], keys: [breathPose(-4, 0.35), breathPose(2, 1)] }],
}

const tricepsExt: Illustration = {
  id: 'triceps_ext',
  view: 'Вид сбоку · лёжа на коврике',
  timeline: [0.5, 1.8, 0.4, 1.2],
  props: [FLOOR, { type: 'mat', x0: 70, x1: 262 }],
  phases: [
    { label: 'Верх', key: 0 },
    { label: 'Низ', key: 1 },
  ],
  figures: [
    {
      rig: 'side',
      muscles: ['triceps'],
      trace: { joint: 'handN', from: 0, to: 1 },
      keys: [
        supine({ armN: { a: 178, b: 0 }, armF: { a: 176, b: 0 }, dbN: { kind: 'bar' }, dbF: { kind: 'bar' } }),
        supine({ armN: { a: 172, b: 135 }, armF: { a: 170, b: 135 }, dbN: { kind: 'bar' }, dbF: { kind: 'bar' } }),
      ],
    },
  ],
}

export const ILLUSTRATIONS: Record<string, Illustration> = Object.fromEntries(
  [
    goblet,
    oneArmRow,
    bentRow,
    floorPress,
    rdl,
    bridge,
    ohp,
    rearDelt,
    curls,
    deadBug,
    birdDog,
    chinTuck,
    doorway,
    catCow,
    thoracic,
    wallSlides,
    ytRaises,
    stepper,
    bbRdl,
    bbRow,
    bbFloorPress,
    bbBridge,
    pelvicTilt,
    hipFlexor,
    towelThoracic,
    latStretch,
    supineChin,
    childsPose,
    tricepsExt,
    kneesToChest,
    quadRock,
    hamstringStretch,
    figureFour,
    heelTaps,
    kneePlank,
    bridgeMarch,
    hipHinge,
    breathing9090,
  ].map((i) => [i.id, i]),
)
