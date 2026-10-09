/**
 * Минимальный 2D-скелет для схематичных иллюстраций техники.
 *
 * Углы задаются в градусах от направления «вниз», положительные — вперёд
 * (для вида сбоку фигура смотрит вправо) или наружу (для вида спереди/сзади).
 * dir(0) = вниз, dir(90) = вправо, dir(180) = вверх.
 */

export type V = { x: number; y: number }
export type Pair = [number, number]

/** Прямая кинематика: a — угол проксимального сегмента, b — сгибание в среднем суставе */
export type LimbFK = { a: number; b: number }
/** Обратная кинематика: цель — положение кисти/голеностопа (абсолютные координаты) */
export type LimbIK = { ik: Pair; bend?: 1 | -1 }
/** Явные точки (проекция движения вне плоскости): средний и конечный сустав относительно корня */
export type LimbPT = { pt: [number, number, number, number] }
export type Limb = LimbFK | LimbIK | LimbPT

export interface Dumbbell {
  /** end — гантель торцом, bar — гантель сбоку, barbell — штанга торцом (вид сбоку) */
  kind: 'end' | 'bar' | 'barbell'
  /** Абсолютный угол оси гантели (для 'bar'); по умолчанию — перпендикулярно предплечью */
  angle?: number
  off?: Pair
}

export interface SidePose {
  p: Pair
  torso: number
  spine?: number
  neck?: number
  headX?: number
  tilt?: number
  face?: number
  armN: Limb
  armF: Limb
  legN: Limb
  legF: Limb
  footN?: number
  footF?: number
  dbN?: Dumbbell
  dbF?: Dumbbell
  /** Яркость подсветки мышц 0…1 (по умолчанию 1) — «включается» в рабочей фазе */
  hl?: number
}

export interface FrontPose {
  c: Pair
  /** Видимая длина корпуса (укорочение при наклоне) */
  lt?: number
  /** Смещение головы по вертикали относительно обычного положения */
  headDy?: number
  /** Наклон головы вбок, градусы; положительный — к правому краю картинки */
  headTilt?: number
  armL: Limb
  armR: Limb
  legL: Limb
  legR: Limb
  liftL?: number
  liftR?: number
  dbL?: Dumbbell
  dbR?: Dumbbell
  /** Масштаб фигуры от пола (приближение к зрителю) */
  s?: number
  hl?: number
}

export const L = {
  torso: 46,
  neck: 15,
  neckBase: 3,
  head: 10.5,
  upperArm: 27,
  forearm: 25,
  thigh: 38,
  shank: 37,
  shoulderHalf: 19,
  hipHalf: 9,
}

// ---------- векторная математика ----------

const RAD = Math.PI / 180

export const v = (x: number, y: number): V => ({ x, y })
export const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k })
export const len = (a: V) => Math.hypot(a.x, a.y)
export const norm = (a: V): V => {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}
export const lerpV = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const dir = (deg: number): V => ({ x: Math.sin(deg * RAD), y: Math.cos(deg * RAD) })
export const angleOf = (d: V) => Math.atan2(d.x, d.y) / RAD
/** Нормаль «спереди» для сегмента, направленного по d (для конечностей) */
export const frontOf = (d: V): V => ({ x: d.y, y: -d.x })
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

function ik2(root: V, target: V, l1: number, l2: number, bend: number): [V, V] {
  const d = sub(target, root)
  const dist = len(d)
  const dc = clamp(dist, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01)
  const base = angleOf(d)
  const cosA = (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc)
  const alpha = Math.acos(clamp(cosA, -1, 1)) / RAD
  const mid = add(root, mul(dir(base + bend * alpha), l1))
  const end = add(mid, mul(norm(sub(target, mid)), l2))
  return [mid, end]
}

export interface LimbSolved {
  root: V
  mid: V
  end: V
}

/**
 * sign — направление «сгибания» для FK: у руки предплечье поворачивается в ту же сторону (+1),
 * у ноги голень — в обратную (−1). mirror — зеркалит ось X (левая сторона вида спереди).
 */
function solveLimb(root: V, limb: Limb, l1: number, l2: number, sign: 1 | -1, defaultBend: 1 | -1, mirror = false): LimbSolved {
  const d = (deg: number) => {
    const r = dir(deg)
    return mirror ? v(-r.x, r.y) : r
  }
  if ('a' in limb) {
    const mid = add(root, mul(d(limb.a), l1))
    const end = add(mid, mul(d(limb.a + sign * limb.b), l2))
    return { root, mid, end }
  }
  if ('ik' in limb) {
    const t = v(limb.ik[0], limb.ik[1])
    const [mid, end] = ik2(root, t, l1, l2, limb.bend ?? defaultBend)
    return { root, mid, end }
  }
  const [mx, my, ex, ey] = limb.pt
  const k = mirror ? -1 : 1
  return { root, mid: add(root, v(mx * k, my)), end: add(root, v(ex * k, ey)) }
}

// ---------- вид сбоку ----------

export interface Foot {
  heel: V
  toe: V
}

export interface SideSkeleton {
  kind: 'side'
  P: V
  S: V
  C: V
  u: V
  f: V
  neckBase: V
  head: V
  faceDir: V
  armN: LimbSolved
  armF: LimbSolved
  legN: LimbSolved
  legF: LimbSolved
  footN: Foot
  footF: Foot
  dbN?: SolvedDb
  dbF?: SolvedDb
  hl: number
}

export interface SolvedDb {
  pos: V
  kind: Dumbbell['kind']
  angle: number
}

function footOf(leg: LimbSolved, angle?: number): Foot {
  const shankAngle = angleOf(sub(leg.end, leg.mid))
  const fd = dir(angle ?? shankAngle + 90)
  const sole = v(-fd.y, fd.x)
  const A = leg.end
  return {
    heel: add(add(A, mul(fd, -5)), mul(sole, 3)),
    toe: add(add(A, mul(fd, 16)), mul(sole, 3.2)),
  }
}

function solveDb(arm: LimbSolved, db?: Dumbbell): SolvedDb | undefined {
  if (!db) return undefined
  const fa = angleOf(sub(arm.end, arm.mid))
  const pos = db.off ? add(arm.end, v(db.off[0], db.off[1])) : arm.end
  return { pos, kind: db.kind, angle: db.angle ?? fa + 90 }
}

export function solveSide(p: SidePose): SideSkeleton {
  const P = v(p.p[0], p.p[1])
  const u = v(Math.sin(p.torso * RAD), -Math.cos(p.torso * RAD))
  const f = v(-u.y, u.x)
  const S = add(P, mul(u, L.torso))
  const mid = lerpV(P, S, 0.5)
  const C = add(mid, mul(f, -(p.spine ?? 0)))

  // касательная в конце кривой (у плеч)
  const uEnd = norm(sub(S, C))
  const fEnd = v(-uEnd.y, uEnd.x)
  const n = (p.neck ?? 0) * RAD
  const headDir = add(mul(uEnd, Math.cos(n)), mul(fEnd, Math.sin(n)))
  const neckBase = add(S, mul(uEnd, L.neckBase))
  const head = add(add(neckBase, mul(headDir, L.neck)), mul(fEnd, p.headX ?? 0))
  const ft = n + (p.tilt ?? 0) * RAD
  const faceDir = p.face !== undefined ? dir(p.face) : add(mul(fEnd, Math.cos(ft)), mul(uEnd, -Math.sin(ft)))

  const armN = solveLimb(S, p.armN, L.upperArm, L.forearm, 1, -1)
  const armF = solveLimb(S, p.armF, L.upperArm, L.forearm, 1, -1)
  const legN = solveLimb(P, p.legN, L.thigh, L.shank, -1, 1)
  const legF = solveLimb(P, p.legF, L.thigh, L.shank, -1, 1)

  return {
    kind: 'side',
    P,
    S,
    C,
    u,
    f,
    neckBase,
    head,
    faceDir,
    armN,
    armF,
    legN,
    legF,
    footN: footOf(legN, p.footN),
    footF: footOf(legF, p.footF),
    dbN: solveDb(armN, p.dbN),
    dbF: solveDb(armF, p.dbF),
    hl: p.hl ?? 1,
  }
}

/** Точка на оси корпуса (квадратичная кривая P → C → S), t может выходить за [0, 1] */
export function torsoPoint(sk: SideSkeleton, t: number): { pt: V; tan: V } {
  const { P, C, S } = sk
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  const pt = v(a * P.x + b * C.x + c * S.x, a * P.y + b * C.y + c * S.y)
  const d = add(mul(sub(C, P), 2 * (1 - t)), mul(sub(S, C), 2 * t))
  return { pt, tan: norm(d) }
}

// ---------- вид спереди / сзади ----------

export interface FrontSkeleton {
  kind: 'front'
  c: V
  shoulderY: number
  lt: number
  head: V
  SL: V
  SR: V
  armL: LimbSolved
  armR: LimbSolved
  legL: LimbSolved
  legR: LimbSolved
  liftL: number
  liftR: number
  dbL?: SolvedDb
  dbR?: SolvedDb
  s: number
  hl: number
}

export function solveFront(p: FrontPose): FrontSkeleton {
  const c = v(p.c[0], p.c[1])
  const lt = p.lt ?? L.torso
  const shoulderY = c.y - lt
  const SL = v(c.x - L.shoulderHalf, shoulderY + 3)
  const SR = v(c.x + L.shoulderHalf, shoulderY + 3)
  const neckH = 8 + L.head - (p.headDy ?? 0) + 2
  const tilt = (p.headTilt ?? 0) * RAD
  const head = v(c.x + neckH * Math.sin(tilt), shoulderY + 2 - neckH * Math.cos(tilt))
  const HL = v(c.x - L.hipHalf, c.y)
  const HR = v(c.x + L.hipHalf, c.y)
  const armL = solveLimb(SL, p.armL, L.upperArm, L.forearm, 1, -1, true)
  const armR = solveLimb(SR, p.armR, L.upperArm, L.forearm, 1, -1, false)
  const legL = solveLimb(HL, p.legL, L.thigh, L.shank, 1, 1, true)
  const legR = solveLimb(HR, p.legR, L.thigh, L.shank, 1, 1, false)
  return {
    kind: 'front',
    c,
    shoulderY,
    lt,
    head,
    SL,
    SR,
    armL,
    armR,
    legL,
    legR,
    liftL: p.liftL ?? 0,
    liftR: p.liftR ?? 0,
    dbL: solveDb(armL, p.dbL),
    dbR: solveDb(armR, p.dbR),
    s: p.s ?? 1,
    hl: p.hl ?? 1,
  }
}

// ---------- интерполяция поз ----------

type Json = number | string | boolean | undefined | null | Json[] | { [k: string]: Json }

export function lerpPose<T>(a: T, b: T, t: number): T {
  return lerpAny(a as Json, b as Json, t) as T
}

function lerpAny(a: Json, b: Json, t: number): Json {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t
  if (typeof a === 'number' && b === undefined) return a
  if (a === undefined && typeof b === 'number') return b
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => lerpAny(x, b[i], t))
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: { [k: string]: Json } = {}
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) out[k] = lerpAny(a[k], b[k], t)
    return out
  }
  return t < 0.5 ? (a ?? b) : (b ?? a)
}

export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t)
