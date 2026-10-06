import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { PostureExercise } from '../types'
import { signal, unlockAudio, useWakeLock } from '../lib/feedback'
import { Ring } from './ui'

export interface Segment {
  label: string
  sub: string
  sec: number
  kind: 'prep' | 'work' | 'rest' | 'switch'
  breath?: 'in' | 'out'
}

export function segmentsFor(ex: PostureExercise): Segment[] {
  const m = ex.mode
  const out: Segment[] = [{ label: 'Приготовься', sub: 'Займи исходное положение', sec: 5, kind: 'prep' }]
  if (m.type === 'hold') {
    const sets = m.sets ?? 1
    const per = m.perSide ? 2 : 1
    for (let s = 0; s < sets; s++) {
      const setName = m.setLabels?.[s] ? `«${m.setLabels[s]}» · ` : sets > 1 ? `Подход ${s + 1} из ${sets} · ` : ''
      const total = m.reps * per
      for (let r = 0; r < total; r++) {
        const side = m.perSide ? (r % 2 === 0 ? ' · правая рука, левая нога' : ' · левая рука, правая нога') : ''
        const n = m.perSide ? Math.floor(r / 2) + 1 : r + 1
        out.push({ label: m.holdLabel, sub: `${setName}повтор ${n} из ${m.reps}${side}`, sec: m.holdSec, kind: 'work' })
        if (r < total - 1) out.push({ label: m.moveLabel, sub: `${setName}дальше повтор ${m.perSide ? Math.floor((r + 1) / 2) + 1 : r + 2}`, sec: m.moveSec, kind: 'rest' })
      }
      if (s < sets - 1) {
        const next = m.setLabels?.[s + 1] ? `Дальше «${m.setLabels[s + 1]}»` : `Дальше подход ${s + 2}`
        out.push({ label: 'Отдых', sub: next, sec: m.restSec ?? 15, kind: 'switch' })
      }
    }
  } else if (m.type === 'timed') {
    const sides = m.perSide ? ['Левая рука', 'Правая рука'] : ['']
    for (let r = 0; r < m.rounds; r++) {
      sides.forEach((side, k) => {
        out.push({ label: 'Растяжка', sub: `${side ? side + ' · ' : ''}подход ${r + 1} из ${m.rounds}`, sec: m.seconds, kind: 'work' })
        const last = r === m.rounds - 1 && k === sides.length - 1
        if (!last)
          out.push(
            m.perSide
              ? { label: 'Выйди и смени сторону', sub: 'Спокойно, без рывков', sec: 6, kind: 'switch' }
              : { label: 'Короткий отдых', sub: 'Затем второй подход', sec: 8, kind: 'switch' },
          )
      })
    }
  } else {
    const sides = m.perSide ? ['Правая сторона', 'Левая сторона'] : ['']
    sides.forEach((side, k) => {
      for (let c = 0; c < m.cycles; c++) {
        for (const ph of m.phases) {
          out.push({
            label: ph.label,
            sub: `${side ? side + ' · ' : ''}цикл ${c + 1} из ${m.cycles}`,
            sec: ph.sec,
            kind: 'work',
            breath: ph.label.startsWith('Вдох') ? 'in' : 'out',
          })
        }
      }
      if (k < sides.length - 1) out.push({ label: 'Смени сторону', sub: 'Другая рука за голову', sec: 6, kind: 'switch' })
    })
  }
  return out
}

export function totalSeconds(segs: Segment[]) {
  return segs.reduce((s, x) => s + x.sec, 0)
}

export function SequenceTimer({ segments, onDone }: { segments: Segment[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(segments[0].sec)
  const [now, setNow] = useState(Date.now())
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const finished = i >= segments.length
  const running = endsAt !== null && !finished
  useWakeLock(running)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    if (!running || endsAt === null || now < endsAt) return
    let idx = i + 1
    let end = endsAt
    while (idx < segments.length && end + segments[idx].sec * 1000 <= now) {
      end += segments[idx].sec * 1000
      idx++
    }
    if (idx >= segments.length) {
      setI(idx)
      setEndsAt(null)
      signal('done')
      doneRef.current()
      return
    }
    setI(idx)
    setEndsAt(end + segments[idx].sec * 1000)
    signal(segments[idx].kind === 'switch' ? 'phase' : 'tick')
  }, [now, running, endsAt, i, segments])

  const start = () => {
    unlockAudio()
    const t = Date.now()
    setNow(t)
    setEndsAt(t + left * 1000)
  }
  const pause = () => {
    if (endsAt === null) return
    setLeft(Math.max(0.1, (endsAt - Date.now()) / 1000))
    setEndsAt(null)
  }
  const skip = () => {
    const idx = i + 1
    if (idx >= segments.length) {
      setI(idx)
      setEndsAt(null)
      doneRef.current()
      return
    }
    setI(idx)
    if (running) {
      const t = Date.now()
      setNow(t)
      setEndsAt(t + segments[idx].sec * 1000)
    } else setLeft(segments[idx].sec)
  }
  const reset = () => {
    setI(0)
    setEndsAt(null)
    setLeft(segments[0].sec)
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-posture/10 py-6 text-center">
        <p className="text-lg font-semibold text-posture">Упражнение выполнено</p>
        <button type="button" onClick={reset} className="mt-2 flex items-center gap-1.5 text-sm text-soft">
          <RotateCcw size={14} /> Повторить
        </button>
      </div>
    )
  }

  const seg = segments[i]
  const remaining = running && endsAt !== null ? Math.max(0, (endsAt - now) / 1000) : left
  const frac = 1 - remaining / seg.sec
  const breathScale = seg.breath === 'in' ? 0.55 + 0.45 * frac : seg.breath === 'out' ? 1 - 0.45 * frac : null
  const color = seg.kind === 'work' ? '#6aa5f2' : seg.kind === 'prep' ? '#a3acb6' : '#8b95a1'

  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-white/[0.045]">
      <div className="flex items-center gap-4">
        <Ring value={frac} size={112} stroke={8} color={color}>
          {breathScale !== null && (
            <span className="absolute size-16 rounded-full bg-posture/25 transition-transform duration-100" style={{ transform: `scale(${breathScale})` }} />
          )}
          <span className="tabular relative text-3xl font-semibold">{Math.ceil(remaining)}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight">{seg.label}</p>
          <p className="mt-1 text-sm text-soft">{seg.sub}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-posture transition-[width]" style={{ width: `${(i / segments.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={running ? pause : start}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-posture font-semibold text-posture-ink active:scale-[0.98]"
        >
          {running ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          {running ? 'Пауза' : i === 0 && left === segments[0].sec ? 'Старт таймера' : 'Продолжить'}
        </button>
        <button type="button" onClick={skip} aria-label="Следующий этап" className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-soft active:scale-95">
          <SkipForward size={18} />
        </button>
        <button type="button" onClick={reset} aria-label="Сначала" className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-soft active:scale-95">
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  )
}
