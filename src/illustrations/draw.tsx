import type { ReactNode } from 'react'
import type { MuscleId } from '../types'
import {
  add,
  dir,
  frontOf,
  lerpV,
  mul,
  norm,
  sub,
  torsoPoint,
  v,
  L,
  type FrontSkeleton,
  type LimbSolved,
  type SideSkeleton,
  type SolvedDb,
  type V,
} from './rig'

export const COLORS = {
  outline: '#15181c',
  near: '#a3adb8',
  body: '#7f8a96',
  far: '#4f5863',
  farDeep: '#434b55',
  muscle: '#2dd4bf',
  muscleFar: '#1b8b80',
  metal: '#c3cbd3',
  metalDark: '#5d6670',
  prop: '#2a3038',
  propLine: '#3a424c',
  mat: '#173432',
  matTop: '#1f4a46',
}

const f1 = (n: number) => Math.round(n * 10) / 10
const pt = (p: V) => `${f1(p.x)} ${f1(p.y)}`

/** Капсула A→B с радиусами r1, r2 */
export function capsule(A: V, B: V, r1: number, r2: number): string {
  const d = norm(sub(B, A))
  const n = v(-d.y, d.x)
  const a1 = add(A, mul(n, r1))
  const b1 = add(B, mul(n, r2))
  const b2 = add(B, mul(n, -r2))
  const a2 = add(A, mul(n, -r1))
  return `M${pt(a1)}L${pt(b1)}A${f1(r2)} ${f1(r2)} 0 0 0 ${pt(b2)}L${pt(a2)}A${f1(r1)} ${f1(r1)} 0 0 0 ${pt(a1)}Z`
}

function smoothClosed(points: V[]): string {
  const n = points.length
  const mid = (a: V, b: V) => lerpV(a, b, 0.5)
  let d = `M${pt(mid(points[n - 1], points[0]))}`
  for (let i = 0; i < n; i++) {
    const p = points[i]
    const next = points[(i + 1) % n]
    d += `Q${pt(p)} ${pt(mid(p, next))}`
  }
  return d + 'Z'
}

function interp(ts: number[], vs: number[], t: number) {
  if (t <= ts[0]) return vs[0]
  for (let i = 1; i < ts.length; i++) {
    if (t <= ts[i]) {
      const k = (t - ts[i - 1]) / (ts[i] - ts[i - 1])
      return vs[i - 1] + (vs[i] - vs[i - 1]) * k
    }
  }
  return vs[vs.length - 1]
}

const T_STOPS = [-0.14, 0, 0.2, 0.45, 0.7, 0.9, 1.0]
const W_FRONT = [5, 9, 12, 13, 12.5, 10.5, 8]
const W_BACK = [10, 12.5, 11, 9.5, 10.5, 10, 8]
const wf = (t: number) => interp(T_STOPS, W_FRONT, t)
const wb = (t: number) => interp(T_STOPS, W_BACK, t)

function torsoOffset(sk: SideSkeleton, t: number, u: number): V {
  const { pt: p, tan } = torsoPoint(sk, t)
  const f = v(-tan.y, tan.x)
  const off = u >= 0 ? u * wf(t) : u * wb(t)
  return add(p, mul(f, off))
}

function torsoPath(sk: SideSkeleton): string {
  const N = 16
  const t0 = T_STOPS[0]
  const front: V[] = []
  const back: V[] = []
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((1 - t0) * i) / N
    front.push(torsoOffset(sk, t, 1))
    back.push(torsoOffset(sk, t, -1))
  }
  // верхняя «крышка» — округлость плеч
  const top = torsoPoint(sk, 1)
  const tf = v(-top.tan.y, top.tan.x)
  const cap: V[] = []
  for (let a = 30; a <= 150; a += 30) {
    const r = (a * Math.PI) / 180
    cap.push(add(top.pt, add(mul(tf, Math.cos(r) * 8), mul(top.tan, Math.sin(r) * 6))))
  }
  const bot = torsoPoint(sk, t0)
  const bf = v(-bot.tan.y, bot.tan.x)
  const capB: V[] = []
  for (let a = 210; a <= 330; a += 40) {
    const r = (a * Math.PI) / 180
    const w = Math.cos(r) < 0 ? wb(t0) : wf(t0)
    capB.push(add(bot.pt, add(mul(bf, -Math.cos(r) * w), mul(bot.tan, Math.sin(r) * 5))))
  }
  return smoothClosed([...front, ...cap, ...back.reverse(), ...capB])
}

function torsoBand(sk: SideSkeleton, t0: number, t1: number, u0: number, u1: number): string {
  const N = 8
  const outer: V[] = []
  const inner: V[] = []
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N
    // сужаем полосу к концам — «брюшко» мышцы
    const k = Math.sin((Math.PI * i) / N) * 0.85 + 0.15
    const um = (u0 + u1) / 2
    const h = ((u1 - u0) / 2) * k
    outer.push(torsoOffset(sk, t, um + h))
    inner.push(torsoOffset(sk, t, um - h))
  }
  return smoothClosed([...outer, ...inner.reverse()])
}

// Радиусы сегментов
const R = {
  ua: [6, 5],
  fa: [4.8, 4],
  hand: 4.3,
  th: [8.8, 6.6],
  sh: [6.2, 4.4],
  foot: 3.6,
  neck: 5.6,
}

type Part = { d: string; fill: string; key: string; opacity?: number }

function limbMuscle(A: V, B: V, r1: number, r2: number, t0: number, t1: number, side: number, key: string, fill: string): Part {
  const d = norm(sub(B, A))
  const fn = frontOf(d)
  const P0 = lerpV(A, B, t0)
  const P1 = lerpV(A, B, t1)
  const rA = r1 + (r2 - r1) * t0
  const rB = r1 + (r2 - r1) * t1
  const off = mul(fn, side * 0.38 * ((rA + rB) / 2))
  return {
    d: capsule(add(P0, off), add(P1, off), rA * (side ? 0.55 : 0.7), rB * (side ? 0.5 : 0.62)),
    fill,
    key,
  }
}

interface ArmMuscles {
  biceps: boolean
  triceps: boolean
  forearms: boolean
  frontDelts: boolean
  sideDelts: boolean
  rearDelts: boolean
}
function armMuscleParts(arm: LimbSolved, m: ArmMuscles, fill: string, k: string): Part[] {
  const out: Part[] = []
  const { root: S, mid: E, end: W } = arm
  if (m.biceps) out.push(limbMuscle(S, E, R.ua[0], R.ua[1], 0.35, 0.85, 1, k + 'bi', fill))
  if (m.triceps) out.push(limbMuscle(S, E, R.ua[0], R.ua[1], 0.3, 0.85, -1, k + 'tri', fill))
  if (m.forearms) out.push(limbMuscle(E, W, R.fa[0], R.fa[1], 0.1, 0.6, 0, k + 'fa', fill))
  if (m.frontDelts) out.push(limbMuscle(S, E, R.ua[0], R.ua[1], -0.05, 0.32, 1, k + 'fd', fill))
  if (m.rearDelts) out.push(limbMuscle(S, E, R.ua[0], R.ua[1], -0.05, 0.32, -1, k + 'rd', fill))
  if (m.sideDelts) out.push(limbMuscle(S, E, R.ua[0], R.ua[1], -0.05, 0.3, 0, k + 'sd', fill))
  return out
}

interface LegMuscles {
  quads: boolean
  hamstrings: boolean
  calves: boolean
  hipFlexors: boolean
}
function legMuscleParts(leg: LimbSolved, m: LegMuscles, fill: string, k: string): Part[] {
  const out: Part[] = []
  const { root: H, mid: K, end: A } = leg
  if (m.quads) out.push(limbMuscle(H, K, R.th[0], R.th[1], 0.2, 0.85, 1, k + 'q', fill))
  if (m.hipFlexors && !m.quads) out.push(limbMuscle(H, K, R.th[0], R.th[1], 0.02, 0.35, 1, k + 'hf', fill))
  if (m.hamstrings) out.push(limbMuscle(H, K, R.th[0], R.th[1], 0.2, 0.85, -1, k + 'h', fill))
  if (m.calves) out.push(limbMuscle(K, A, R.sh[0], R.sh[1], 0.1, 0.5, -1, k + 'c', fill))
  return out
}

function armParts(arm: LimbSolved, color: string, k: string): Part[] {
  return [
    { d: capsule(arm.root, arm.mid, R.ua[0], R.ua[1]), fill: color, key: k + 'ua' },
    { d: capsule(arm.mid, arm.end, R.fa[0], R.fa[1]), fill: color, key: k + 'fa' },
    { d: capsule(arm.end, arm.end, R.hand, R.hand), fill: color, key: k + 'h' },
  ]
}

function legParts(leg: LimbSolved, foot: { heel: V; toe: V } | null, color: string, k: string): Part[] {
  const out: Part[] = [
    { d: capsule(leg.root, leg.mid, R.th[0], R.th[1]), fill: color, key: k + 'th' },
    { d: capsule(leg.mid, leg.end, R.sh[0], R.sh[1]), fill: color, key: k + 'sh' },
  ]
  if (foot) out.push({ d: capsule(foot.heel, foot.toe, R.foot, 2.8), fill: color, key: k + 'ft' })
  return out
}

function renderParts(parts: Part[]) {
  return parts.map((p) => (
    <path
      key={p.key}
      d={p.d}
      fill={p.fill}
      opacity={p.opacity}
      stroke={COLORS.outline}
      strokeWidth={2.2}
      strokeLinejoin="round"
      paintOrder="stroke"
    />
  ))
}

function renderMuscles(parts: Part[], k = 1) {
  if (k <= 0.01) return null
  return parts.map((p) => <path key={p.key} d={p.d} fill={p.fill} opacity={0.92 * k} />)
}

export function Dumbbell({ db, far }: { db: SolvedDb; far?: boolean }) {
  const plate = far ? '#7c858f' : COLORS.metal
  if (db.kind === 'barbell') {
    // Штанга, видимая с торца: ближний блин крупнее гантельного, с втулкой
    return (
      <g>
        <circle cx={db.pos.x} cy={db.pos.y} r={10} fill={plate} stroke={COLORS.outline} strokeWidth={2} paintOrder="stroke" />
        <circle cx={db.pos.x} cy={db.pos.y} r={7} fill="none" stroke={COLORS.metalDark} strokeWidth={1} opacity={0.55} />
        <circle cx={db.pos.x} cy={db.pos.y} r={3.4} fill={COLORS.metalDark} />
        <circle cx={db.pos.x} cy={db.pos.y} r={1.4} fill={COLORS.metal} />
      </g>
    )
  }
  if (db.kind === 'end') {
    return (
      <g>
        <circle cx={db.pos.x} cy={db.pos.y} r={7.6} fill={plate} stroke={COLORS.outline} strokeWidth={2} paintOrder="stroke" />
        <circle cx={db.pos.x} cy={db.pos.y} r={4.8} fill="none" stroke={COLORS.metalDark} strokeWidth={1} opacity={0.6} />
        <circle cx={db.pos.x} cy={db.pos.y} r={2} fill={COLORS.metalDark} />
      </g>
    )
  }
  const a = dir(db.angle)
  const svgAngle = (Math.atan2(a.y, a.x) * 180) / Math.PI
  return (
    <g transform={`translate(${f1(db.pos.x)} ${f1(db.pos.y)}) rotate(${f1(svgAngle)})`}>
      <rect x={-11} y={-1.6} width={22} height={3.2} rx={1.2} fill={COLORS.metalDark} />
      <rect x={-13.5} y={-7.5} width={5} height={15} rx={1.6} fill={plate} stroke={COLORS.outline} strokeWidth={1.6} paintOrder="stroke" />
      <rect x={8.5} y={-7.5} width={5} height={15} rx={1.6} fill={plate} stroke={COLORS.outline} strokeWidth={1.6} paintOrder="stroke" />
    </g>
  )
}

function hasM(m: Set<MuscleId>, id: MuscleId) {
  return m.has(id)
}

// ---------- фигура сбоку ----------

export function SideFigure({
  sk,
  muscles,
  pedals,
  nearOnly,
}: {
  sk: SideSkeleton
  muscles: MuscleId[]
  /** Подсвечивать мышцы только ближних конечностей (растяжка одной стороны) */
  nearOnly?: boolean
  pedals?: boolean
}) {
  const m = new Set(muscles)
  const arm: ArmMuscles = {
    biceps: hasM(m, 'biceps'),
    triceps: hasM(m, 'triceps'),
    forearms: hasM(m, 'forearms'),
    frontDelts: hasM(m, 'frontDelts'),
    sideDelts: hasM(m, 'sideDelts'),
    rearDelts: hasM(m, 'rearDelts'),
  }
  const leg: LegMuscles = {
    quads: hasM(m, 'quads'),
    hamstrings: hasM(m, 'hamstrings'),
    calves: hasM(m, 'calves'),
    hipFlexors: hasM(m, 'hipFlexors'),
  }

  const farParts = [...legParts(sk.legF, sk.footF, COLORS.far, 'lf'), ...armParts(sk.armF, COLORS.far, 'af')]
  const farMuscles = [
    ...legMuscleParts(sk.legF, leg, COLORS.muscleFar, 'mlf'),
    ...armMuscleParts(sk.armF, arm, COLORS.muscleFar, 'maf'),
  ]

  // корпус
  const torso = torsoPath(sk)
  const bands: Part[] = []
  const band = (id: MuscleId, t0: number, t1: number, u0: number, u1: number) => {
    if (m.has(id)) bands.push({ d: torsoBand(sk, t0, t1, u0, u1), fill: COLORS.muscle, key: 'tb' + id })
  }
  band('chest', 0.6, 0.92, 0.35, 0.95)
  band('core', 0.08, 0.58, 0.45, 0.95)
  band('obliques', 0.12, 0.5, -0.15, 0.4)
  band('serratus', 0.55, 0.78, 0.0, 0.42)
  band('erectors', 0.02, 0.62, -0.95, -0.55)
  band('lats', 0.35, 0.78, -0.9, -0.2)
  band('upperBack', 0.68, 0.98, -0.95, -0.45)
  band('lowerTraps', 0.5, 0.82, -0.95, -0.6)
  if (m.has('glutes')) {
    const g = torsoOffset(sk, -0.02, -0.62)
    const tan = torsoPoint(sk, 0).tan
    const ang = (Math.atan2(tan.y, tan.x) * 180) / Math.PI
    bands.push({ d: ellipsePath(g, 9.5, 7.2, ang), fill: COLORS.muscle, key: 'glutes' })
  }

  const headUp = norm(sub(sk.head, sk.neckBase))
  const neckPart: Part = {
    d: capsule(add(sk.neckBase, mul(headUp, -5)), sk.head, R.neck, R.neck - 0.4),
    fill: COLORS.body,
    key: 'neck',
  }
  const neckMuscle: Part[] = m.has('neckFlexors')
    ? [limbMuscleNeck(sk.neckBase, sk.head, sk.faceDir)]
    : []

  const nearParts = [...legParts(sk.legN, sk.footN, COLORS.near, 'ln')]
  const nearLegMuscles = legMuscleParts(sk.legN, leg, COLORS.muscle, 'mln')
  const nearArm = armParts(sk.armN, COLORS.near, 'an')
  const nearArmMuscles = armMuscleParts(sk.armN, arm, COLORS.muscle, 'man')

  const fd = sk.faceDir
  const nose = [
    add(sk.head, mul(fd, L.head + 3.4)),
    add(add(sk.head, mul(fd, L.head * 0.72)), mul(headUp, 3.8)),
    add(add(sk.head, mul(fd, L.head * 0.72)), mul(headUp, -2.2)),
  ]
  const eye = add(add(sk.head, mul(fd, 5.2)), mul(headUp, 2.6))
  const ear = add(add(sk.head, mul(fd, -1.4)), mul(headUp, 0.4))

  const content: ReactNode = (
    <>
      {pedals && <Pedal foot={sk.footF} far />}
      {sk.dbF && sk.dbF.kind === 'bar' && <Dumbbell db={sk.dbF} far />}
      {renderParts(farParts)}
      {!nearOnly && renderMuscles(farMuscles, sk.hl)}
      {sk.dbF && sk.dbF.kind !== 'bar' && <Dumbbell db={sk.dbF} far />}
      {renderParts([neckPart])}
      {renderMuscles(neckMuscle, sk.hl)}
      <path d={torso} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2.2} paintOrder="stroke" />
      {renderMuscles(bands, sk.hl)}
      <circle cx={sk.head.x} cy={sk.head.y} r={L.head} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2.2} paintOrder="stroke" />
      <path d={`M${pt(nose[0])}L${pt(nose[1])}L${pt(nose[2])}Z`} fill={COLORS.body} stroke={COLORS.body} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={eye.x} cy={eye.y} r={1.3} fill={COLORS.outline} />
      <ellipse cx={ear.x} cy={ear.y} rx={2.1} ry={2.8} fill="none" stroke="#5f6a76" strokeWidth={1.3} />
      {pedals && <Pedal foot={sk.footN} />}
      {renderParts(nearParts)}
      {renderMuscles(nearLegMuscles, sk.hl)}
      {sk.dbN && sk.dbN.kind === 'bar' && <Dumbbell db={sk.dbN} />}
      {renderParts(nearArm)}
      {renderMuscles(nearArmMuscles, sk.hl)}
      {sk.dbN && sk.dbN.kind !== 'bar' && <Dumbbell db={sk.dbN} />}
    </>
  )
  return <g>{content}</g>
}

function limbMuscleNeck(base: V, head: V, face: V): Part {
  const A = add(base, mul(face, 3))
  const B = add(lerpV(base, head, 0.75), mul(face, 3))
  return { d: capsule(A, B, 2.6, 2.2), fill: COLORS.muscle, key: 'neckm' }
}

function ellipsePath(c: V, rx: number, ry: number, angleDeg: number): string {
  const pts: V[] = []
  const a = (angleDeg * Math.PI) / 180
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2
    const x = Math.cos(t) * rx
    const y = Math.sin(t) * ry
    pts.push(v(c.x + x * Math.cos(a) - y * Math.sin(a), c.y + x * Math.sin(a) + y * Math.cos(a)))
  }
  return smoothClosed(pts)
}

function Pedal({ foot, far }: { foot: { heel: V; toe: V }; far?: boolean }) {
  const mid = lerpV(foot.heel, foot.toe, 0.5)
  const y = Math.max(foot.heel.y, foot.toe.y) + 4.5
  return (
    <g>
      <line x1={mid.x - 4} y1={y + 2} x2={mid.x - 12} y2={212} stroke={far ? '#333a43' : '#434c56'} strokeWidth={3} strokeLinecap="round" />
      <rect x={mid.x - 13} y={y - 1} width={28} height={5} rx={2} fill={far ? '#3a424c' : '#56606b'} stroke={COLORS.outline} strokeWidth={1.5} paintOrder="stroke" />
    </g>
  )
}

// ---------- вид спереди / сзади / сверху ----------

export function FrontFigure({
  sk,
  muscles,
  view,
  side,
}: {
  sk: FrontSkeleton
  muscles: MuscleId[]
  view: 'front' | 'back' | 'top'
  /** Подсвечивать мышцы только одной стороны (L — слева от зрителя) */
  side?: 'L' | 'R'
}) {
  const hlK = sk.hl
  const onL = side !== 'R'
  const onR = side !== 'L'
  const m = new Set(muscles)
  const back = view !== 'front'
  const { c, shoulderY: sy, lt } = sk
  const x = c.x

  // корпус
  const torsoPts: V[] = [
    v(x - 15, sy - 1),
    v(x - 20.5, sy + 4),
    v(x - 20.5, sy + lt * 0.3),
    v(x - 18.5, sy + lt * 0.62),
    v(x - 18, c.y - 1),
    v(x - 15.5, c.y + 8),
    v(x, c.y + 10),
    v(x + 15.5, c.y + 8),
    v(x + 18, c.y - 1),
    v(x + 18.5, sy + lt * 0.62),
    v(x + 20.5, sy + lt * 0.3),
    v(x + 20.5, sy + 4),
    v(x + 15, sy - 1),
    v(x, sy - 3),
  ]
  const torso = smoothClosed(torsoPts)

  const parts = (arm: LimbSolved, k: string) => armParts(arm, COLORS.near, k)
  const legsP = [
    ...legParts(sk.legL, null, COLORS.body, 'll'),
    ...legParts(sk.legR, null, COLORS.body, 'lr'),
  ]

  const tm: ReactNode[] = []
  const E = (key: string, cx: number, cy: number, rx: number, ry: number, rot = 0) =>
    tm.push(<ellipse key={key} cx={cx} cy={cy} rx={rx} ry={ry} fill={COLORS.muscle} opacity={0.92 * hlK} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />)
  const Cp = (key: string, A: V, B: V, r1: number, r2: number) =>
    tm.push(<path key={key} d={capsule(A, B, r1, r2)} fill={COLORS.muscle} opacity={0.92 * hlK} />)

  if (back) {
    if (m.has('upperBack')) {
      Cp('ub1', v(x - 9, sy + lt * 0.12), v(x - 4, sy + lt * 0.42), 4.2, 3.2)
      Cp('ub2', v(x + 9, sy + lt * 0.12), v(x + 4, sy + lt * 0.42), 4.2, 3.2)
    }
    if (m.has('lowerTraps')) {
      Cp('lt1', v(x - 7, sy + lt * 0.3), v(x - 1.5, sy + lt * 0.66), 3.4, 1.8)
      Cp('lt2', v(x + 7, sy + lt * 0.3), v(x + 1.5, sy + lt * 0.66), 3.4, 1.8)
    }
    if (m.has('lats')) {
      Cp('la1', v(x - 15, sy + lt * 0.3), v(x - 10, sy + lt * 0.78), 4.4, 2.6)
      Cp('la2', v(x + 15, sy + lt * 0.3), v(x + 10, sy + lt * 0.78), 4.4, 2.6)
    }
    if (m.has('erectors')) {
      Cp('er1', v(x - 4, sy + lt * 0.45), v(x - 4, c.y - 2), 2.8, 2.8)
      Cp('er2', v(x + 4, sy + lt * 0.45), v(x + 4, c.y - 2), 2.8, 2.8)
    }
    if (m.has('glutes')) {
      E('gl1', x - 8.5, c.y + 3, 8, 7)
      E('gl2', x + 8.5, c.y + 3, 8, 7)
    }
  } else {
    if (m.has('chest')) {
      if (onL) E('ch1', x - 9, sy + lt * 0.2, 8.5, 5.8)
      if (onR) E('ch2', x + 9, sy + lt * 0.2, 8.5, 5.8)
    }
    if (m.has('core')) Cp('co', v(x, sy + lt * 0.42), v(x, c.y - 3), 5.5, 5)
    if (m.has('serratus')) {
      Cp('se1', v(x - 17.5, sy + lt * 0.3), v(x - 16, sy + lt * 0.55), 2.6, 2.2)
      Cp('se2', v(x + 17.5, sy + lt * 0.3), v(x + 16, sy + lt * 0.55), 2.6, 2.2)
    }
    if (m.has('obliques')) {
      Cp('ob1', v(x - 14, sy + lt * 0.55), v(x - 13, c.y - 3), 3, 2.6)
      Cp('ob2', v(x + 14, sy + lt * 0.55), v(x + 13, c.y - 3), 3, 2.6)
    }
  }

  const shoulderM = back ? m.has('rearDelts') || m.has('sideDelts') : m.has('frontDelts') || m.has('sideDelts')
  const armM = (arm: LimbSolved, k: string): Part[] => {
    const out: Part[] = []
    if (shoulderM) out.push(limbMuscle(arm.root, arm.mid, R.ua[0], R.ua[1], -0.08, 0.3, 0, k + 'd', COLORS.muscle))
    if ((back && m.has('triceps')) || (!back && m.has('biceps')))
      out.push(limbMuscle(arm.root, arm.mid, R.ua[0], R.ua[1], 0.38, 0.85, 0, k + 'ua', COLORS.muscle))
    if (m.has('forearms')) out.push(limbMuscle(arm.mid, arm.end, R.fa[0], R.fa[1], 0.1, 0.6, 0, k + 'f', COLORS.muscle))
    return out
  }
  const legM = (leg: LimbSolved, k: string): Part[] => {
    const out: Part[] = []
    if ((back && m.has('hamstrings')) || (!back && m.has('quads')))
      out.push(limbMuscle(leg.root, leg.mid, R.th[0], R.th[1], 0.2, 0.85, 0, k + 't', COLORS.muscle))
    if (back && m.has('calves')) out.push(limbMuscle(leg.mid, leg.end, R.sh[0], R.sh[1], 0.1, 0.5, 0, k + 'c', COLORS.muscle))
    return out
  }

  const feet =
    view === 'top'
      ? [sk.legL, sk.legR].map((l, i) => {
          const d = norm(sub(l.end, l.mid))
          const tip = add(l.end, mul(d, 7))
          return <path key={'ft' + i} d={capsule(l.end, tip, 4, 3.2)} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2} paintOrder="stroke" />
        })
      : [sk.legL, sk.legR].map((l, i) => {
          const s = i === 0 ? -1 : 1
          return <ellipse key={'ft' + i} cx={l.end.x + s * 3} cy={l.end.y + 3} rx={7} ry={3.8} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2} paintOrder="stroke" />
        })

  const shadow = (arm: LimbSolved, lift: number, k: string) =>
    lift > 0.02 ? (
      <g key={k} transform={`translate(${f1(lift * 5)} ${f1(-lift * 5)})`} opacity={0.4 * lift}>
        {armParts(arm, '#000', k).map((p) => (
          <path key={p.key} d={p.d} fill="#05070a" />
        ))}
      </g>
    ) : null

  const headEl = (
    <g>
      <path d={capsule(v(x, sy + 2), sk.head, R.neck, R.neck)} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2.2} paintOrder="stroke" />
      <circle cx={sk.head.x} cy={sk.head.y} r={L.head} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2.2} paintOrder="stroke" />
      {back && (
        <path
          d={`M${f1(sk.head.x - L.head + 0.6)} ${f1(sk.head.y + 1)}A${L.head - 0.6} ${L.head - 0.6} 0 0 1 ${f1(sk.head.x + L.head - 0.6)} ${f1(sk.head.y + 1)}Q${f1(sk.head.x)} ${f1(sk.head.y - 2)} ${f1(sk.head.x - L.head + 0.6)} ${f1(sk.head.y + 1)}Z`}
          fill="#5a6470"
        />
      )}
      {!back && m.has('neckFlexors') && <path d={capsule(v(x, sy + 1), v(x, sk.head.y + 8), 2.4, 2)} fill={COLORS.muscle} />}
    </g>
  )

  // Голова рисуется до корпуса, если фигура наклонена (смотрим сзади — голова за спиной)
  const headBehind = back && lt < L.torso * 0.85
  const liftL = sk.liftL
  const liftR = sk.liftR
  const scaleT = Math.abs(sk.s - 1) > 0.001 ? `translate(${f1(x)} ${FLOOR_Y}) scale(${sk.s.toFixed(3)}) translate(${f1(-x)} ${-FLOOR_Y})` : undefined

  return (
    <g transform={scaleT}>
      {shadow(sk.armL, liftL, 'shL')}
      {shadow(sk.armR, liftR, 'shR')}
      {headBehind && headEl}
      {renderParts(legsP)}
      {feet}
      {renderMuscles([...(onL ? legM(sk.legL, 'mll') : []), ...(onR ? legM(sk.legR, 'mlr') : [])], hlK)}
      <path d={torso} fill={COLORS.body} stroke={COLORS.outline} strokeWidth={2.2} paintOrder="stroke" />
      {back && <line x1={x} y1={sy + 4} x2={x} y2={c.y - 2} stroke="#6d7783" strokeWidth={1} opacity={0.6} />}
      {tm}
      {!headBehind && headEl}
      {sk.dbL && sk.dbL.kind === 'bar' && <Dumbbell db={sk.dbL} />}
      {sk.dbR && sk.dbR.kind === 'bar' && <Dumbbell db={sk.dbR} />}
      <g transform={liftL > 0.02 ? `translate(${f1(-liftL * 1.2)} ${f1(liftL * 1.2)})` : undefined}>
        {renderParts(parts(sk.armL, 'aL'))}
        {onL && renderMuscles(armM(sk.armL, 'maL'), hlK)}
      </g>
      <g transform={liftR > 0.02 ? `translate(${f1(-liftR * 1.2)} ${f1(liftR * 1.2)})` : undefined}>
        {renderParts(parts(sk.armR, 'aR'))}
        {onR && renderMuscles(armM(sk.armR, 'maR'), hlK)}
      </g>
      {sk.dbL && sk.dbL.kind === 'end' && <Dumbbell db={sk.dbL} />}
      {sk.dbR && sk.dbR.kind === 'end' && <Dumbbell db={sk.dbR} />}
    </g>
  )
}

// ---------- реквизит ----------

export type Prop =
  | { type: 'floor'; y?: number }
  | { type: 'mat'; x0: number; x1: number; y?: number }
  | { type: 'matTop'; x: number; y: number; w: number; h: number }
  | { type: 'wall'; x: number }
  | { type: 'wallBack'; x0: number; x1: number; y0: number }
  | { type: 'post'; x: number; w?: number; y0?: number }
  | { type: 'chair'; x: number; y: number; w: number }
  | { type: 'towel'; x: number; y: number; w: number; h: number }
  | { type: 'plumb'; x: number; y0: number; y1: number }
  | { type: 'stepperBase'; x: number; w: number }
  | { type: 'label'; x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }
  /** Дверной проём, вид спереди: стена, тёмный проём, наличник */
  | { type: 'doorFront'; x0: number; x1: number; top: number }
  /** Подложка для врезки с дополнительным видом */
  | { type: 'panel'; x: number; y: number; w: number; h: number }
  | { type: 'hline'; x0: number; x1: number; y: number }
  /** Валик из полотенца (вид с торца) */
  | { type: 'roll'; x: number; y: number; r: number }

export const FLOOR_Y = 212

export function PropView({ p }: { p: Prop }) {
  switch (p.type) {
    case 'floor': {
      const y = p.y ?? FLOOR_Y
      return (
        <g>
          <rect x={0} y={y} width={320} height={240 - y} fill="#1a1e23" />
          <line x1={0} y1={y} x2={320} y2={y} stroke={COLORS.propLine} strokeWidth={1.5} />
        </g>
      )
    }
    case 'mat': {
      const y = p.y ?? FLOOR_Y
      return <rect x={p.x0} y={y - 4} width={p.x1 - p.x0} height={5} rx={2} fill={COLORS.matTop} />
    }
    case 'matTop':
      return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} fill={COLORS.mat} stroke={COLORS.matTop} strokeWidth={1.5} />
    case 'wall':
      return (
        <g>
          <rect x={p.x} y={0} width={320 - p.x} height={FLOOR_Y} fill="#20252b" />
          <line x1={p.x} y1={0} x2={p.x} y2={FLOOR_Y} stroke={COLORS.propLine} strokeWidth={1.5} />
        </g>
      )
    case 'wallBack':
      return (
        <g>
          <rect x={p.x0} y={p.y0} width={p.x1 - p.x0} height={FLOOR_Y - p.y0} rx={6} fill="#1e2328" />
          <rect x={p.x0} y={FLOOR_Y - 8} width={p.x1 - p.x0} height={8} fill="#242a31" />
        </g>
      )
    case 'post': {
      const w = p.w ?? 9
      return (
        <g>
          <rect x={p.x - w / 2} y={p.y0 ?? 18} width={w} height={FLOOR_Y - (p.y0 ?? 18)} rx={2} fill="#2c333b" stroke={COLORS.propLine} strokeWidth={1} />
        </g>
      )
    }
    case 'chair':
      return (
        <g>
          <rect x={p.x} y={p.y} width={p.w} height={6} rx={2} fill="#3a424c" />
          <rect x={p.x + 3} y={p.y + 6} width={4} height={FLOOR_Y - p.y - 6} fill="#30373f" />
          <rect x={p.x + p.w - 7} y={p.y + 6} width={4} height={FLOOR_Y - p.y - 6} fill="#30373f" />
        </g>
      )
    case 'towel':
      return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4} fill="#3b3f52" opacity={0.9} />
    case 'plumb':
      return <line x1={p.x} y1={p.y0} x2={p.x} y2={p.y1} stroke="#5eead4" strokeWidth={1.1} strokeDasharray="3 3" opacity={0.85} />
    case 'doorFront': {
      const t = 12
      return (
        <g>
          <rect x={6} y={8} width={308} height={FLOOR_Y - 8} rx={8} fill="#1d2227" />
          <rect x={p.x0} y={p.top} width={p.x1 - p.x0} height={FLOOR_Y - p.top} fill="#0f1215" />
          <rect x={p.x0 - t} y={p.top - t} width={p.x1 - p.x0 + 2 * t} height={t} rx={2} fill="#30373f" />
          <rect x={p.x0 - t} y={p.top - t} width={t} height={FLOOR_Y - p.top + t} rx={2} fill="#30373f" />
          <rect x={p.x1} y={p.top - t} width={t} height={FLOOR_Y - p.top + t} rx={2} fill="#30373f" />
        </g>
      )
    }
    case 'panel':
      return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} fill="#14171b" stroke="#2a3037" strokeWidth={1} />
    case 'roll':
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={p.r} fill="#4a4f66" />
          <circle cx={p.x} cy={p.y} r={p.r * 0.55} fill="none" stroke="#2f3346" strokeWidth={0.8} />
        </g>
      )
    case 'hline':
      return <line x1={p.x0} y1={p.y} x2={p.x1} y2={p.y} stroke={COLORS.propLine} strokeWidth={2} />
    case 'stepperBase':
      return <rect x={p.x} y={FLOOR_Y - 7} width={p.w} height={7} rx={3} fill="#2f363e" />
    case 'label':
      return (
        <text x={p.x} y={p.y} fill="#8a949f" fontSize={10} textAnchor={p.anchor ?? 'start'} fontFamily="inherit">
          {p.text}
        </text>
      )
  }
}


