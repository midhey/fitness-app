import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { ILLUSTRATIONS, type FigureSpec, type Illustration, type JointName } from './library'
import { FrontFigure, PropView, SideFigure } from './draw'
import { easeInOut, lerpPose, solveFront, solveSide, type V } from './rig'

function samplePose<T>(keys: T[], timeline: number[], time: number): T {
  if (keys.length === 1) return keys[0]
  const total = timeline.reduce((s, x) => s + x, 0)
  let t = ((time % total) + total) % total
  for (let i = 0; i < keys.length; i++) {
    const hold = timeline[2 * i] ?? 0
    const move = timeline[2 * i + 1] ?? 1
    if (t < hold) return keys[i]
    t -= hold
    if (t < move) return lerpPose(keys[i], keys[(i + 1) % keys.length], easeInOut(t / move))
    t -= move
  }
  return keys[0]
}

function keyOffset(timeline: number[], key: number) {
  let s = 0
  for (let i = 0; i < key * 2; i++) s += timeline[i] ?? 0
  return s
}

function jointOf(fig: FigureSpec, pose: unknown, joint: JointName): V {
  if (fig.rig === 'side') {
    const sk = solveSide(pose as never)
    switch (joint) {
      case 'handN':
        return sk.armN.end
      case 'handF':
        return sk.armF.end
      case 'elbowN':
        return sk.armN.mid
      case 'footN':
        return sk.legN.end
      case 'footF':
        return sk.legF.end
      case 'head':
        return sk.head
      case 'P':
        return sk.P
      default:
        return sk.armN.end
    }
  }
  const sk = solveFront(pose as never)
  return joint === 'handR' ? sk.armR.end : sk.armL.end
}

function Trace({ fig }: { fig: FigureSpec }) {
  const d = useMemo(() => {
    if (!fig.trace) return null
    const { joint, from, to } = fig.trace
    const a = fig.keys[from]
    const b = fig.keys[to]
    const pts: V[] = []
    for (let i = 0; i <= 18; i++) {
      pts.push(jointOf(fig, lerpPose(a as never, b as never, easeInOut(i / 18)), joint))
    }
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 3]
    const dx = last.x - prev.x
    const dy = last.y - prev.y
    const l = Math.hypot(dx, dy) || 1
    const ux = dx / l
    const uy = dy / l
    const head = [
      `${last.x + ux * 5} ${last.y + uy * 5}`,
      `${last.x - uy * 3.6} ${last.y + ux * 3.6}`,
      `${last.x + uy * 3.6} ${last.y - ux * 3.6}`,
    ]
    return {
      line: 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L'),
      head: `M${head[0]}L${head[1]}L${head[2]}Z`,
    }
  }, [fig])
  if (!d) return null
  return (
    <g opacity={0.75}>
      <path d={d.line} fill="none" stroke="#5eead4" strokeWidth={1.4} strokeDasharray="2.5 3.5" strokeLinecap="round" />
      <path d={d.head} fill="#5eead4" />
    </g>
  )
}

function FigureView({ fig, pose }: { fig: FigureSpec; pose: unknown }) {
  return (
    <g transform={fig.transform}>
      {fig.props?.map((p, i) => <PropView key={i} p={p} />)}
      <Trace fig={fig} />
      {fig.rig === 'side' ? (
        <SideFigure sk={solveSide(pose as never)} muscles={fig.muscles} pedals={fig.pedals} nearOnly={fig.nearOnly} />
      ) : (
        <FrontFigure sk={solveFront(pose as never)} muscles={fig.muscles} view={fig.view} side={fig.muscleSide} />
      )}
      {fig.overlay?.map((p, i) => <PropView key={'o' + i} p={p} />)}
    </g>
  )
}

function useReducedMotion() {
  const [r, setR] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  )
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setR(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return r
}

export function ExerciseIllustration({
  id,
  compact = false,
  className = '',
}: {
  id: string
  compact?: boolean
  className?: string
}) {
  const spec: Illustration | undefined = ILLUSTRATIONS[id]
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(!reduced)
  const [time, setTime] = useState(0)
  const [visible, setVisible] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTime(0)
    setPlaying(!reduced)
  }, [id, reduced])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !visible) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (document.visibilityState === 'visible') setTime((t) => t + dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, visible])

  if (!spec) return null

  const poses = spec.figures.map((f) => samplePose(f.keys as unknown[], spec.timeline, time))
  const total = spec.timeline.reduce((s, x) => s + x, 0)
  const cycleT = ((time % total) + total) % total
  const activePhase = !playing
    ? spec.phases.findIndex((p) => Math.abs(keyOffset(spec.timeline, p.key) - cycleT) < 0.01)
    : -1

  const jump = (key: number) => {
    setPlaying(false)
    setTime(keyOffset(spec.timeline, key) + 0.001)
  }

  return (
    <figure className={className}>
    <div ref={ref} className="relative overflow-hidden rounded-2xl bg-[#15181c] ring-1 ring-white/5">
      <svg
        viewBox="0 0 320 240"
        className="block h-auto w-full"
        role="img"
        aria-label={`Схема движения: ${spec.view}`}
      >
        <defs>
          <radialGradient id={`bg-${id}`} cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#1d2227" />
            <stop offset="100%" stopColor="#15181c" />
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill={`url(#bg-${id})`} />
        {spec.props.map((p, i) => (
          <PropView key={i} p={p} />
        ))}
        {spec.figures.map((f, i) => (
          <FigureView key={i} fig={f} pose={poses[i]} />
        ))}
      </svg>

      <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
        <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase tracking-wide">Схема</span>
        <span>{spec.view}</span>
      </div>

      {!compact && (
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="grid size-9 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur active:scale-95"
            aria-label={playing ? 'Пауза анимации' : 'Запустить анимацию'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>
          <div className="flex gap-1 rounded-full bg-black/45 p-0.5 backdrop-blur">
            {spec.phases.map((p, i) => (
              <button
                key={p.label + i}
                type="button"
                onClick={() => jump(p.key)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  activePhase === i ? 'bg-teal-400/90 text-[#0c1413]' : 'text-white/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] text-white/55 backdrop-blur">
            <span className="size-2 rounded-full bg-teal-400" /> мышцы
          </span>
        </div>
      )}
    </div>
    {spec.note && !compact && <figcaption className="mt-1.5 px-1 text-xs text-mute">{spec.note}</figcaption>}
    </figure>
  )
}

/** Неподвижный кадр (для миниатюр в списках) */
export function StaticIllustration({ id, keyIndex, className = '' }: { id: string; keyIndex?: number; className?: string }) {
  const spec = ILLUSTRATIONS[id]
  if (!spec) return null
  const k = keyIndex ?? spec.phases[spec.phases.length - 1]?.key ?? 0
  return (
    <svg viewBox="0 0 320 240" className={`block h-auto w-full ${className}`} aria-hidden="true">
      <rect width="320" height="240" fill="#171a1e" />
      {spec.props.map((p, i) => (
        <PropView key={i} p={p} />
      ))}
      {spec.figures.map((f, i) => (
        <FigureView key={i} fig={f} pose={f.keys[Math.min(k, f.keys.length - 1)]} />
      ))}
    </svg>
  )
}
