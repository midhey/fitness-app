import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { diffDays, fmtShort, parseISO } from '../lib/date'

export interface ChartPoint {
  date: string
  value: number
  /** Подпись в подсказке (вместо значения) */
  detail?: string
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))))
    ro.observe(el)
    setW(Math.max(200, Math.round(el.getBoundingClientRect().width)))
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceStep(range: number) {
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]
  for (const s of steps) if (range / s <= 5) return s
  return 200
}

const fmtNum = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

/**
 * Однорядный линейный график по датам: линия 2px, заливка 10%, волосяная сетка,
 * пунктир — пороговая линия цели, перекрестие с подсказкой по касанию/наведению и стрелкам.
 */
export function LineChart({
  points,
  goal,
  goalLabel,
  unit,
  height = 200,
  ariaLabel,
}: {
  points: ChartPoint[]
  goal?: number
  goalLabel?: string
  unit: string
  height?: number
  ariaLabel: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const pad = { l: 36, r: 14, t: 14, b: 26 }
  const iw = width - pad.l - pad.r
  const ih = height - pad.t - pad.b

  const geo = useMemo(() => {
    if (!points.length) return null
    const vals = points.map((p) => p.value)
    let lo = Math.min(...vals, goal ?? Infinity)
    let hi = Math.max(...vals, goal ?? -Infinity)
    if (hi - lo < 2) {
      lo -= 1
      hi += 1
    }
    const step = niceStep(hi - lo)
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
    const ticks: number[] = []
    for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10)
    const d0 = points[0].date
    const span = Math.max(1, diffDays(points[points.length - 1].date, d0))
    const x = (iso: string) => (points.length === 1 ? pad.l + iw / 2 : pad.l + (diffDays(iso, d0) / span) * iw)
    const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * ih
    const xy = points.map((p) => ({ x: x(p.date), y: y(p.value) }))
    const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
    const area = xy.length > 1 ? `${line}L${xy[xy.length - 1].x.toFixed(1)} ${pad.t + ih}L${xy[0].x.toFixed(1)} ${pad.t + ih}Z` : ''
    // подписи дат: начало, середина, конец
    const idx = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1]
    const xLabels = [...new Set(idx)].map((i) => ({ x: xy[i].x, text: fmtShort(points[i].date) }))
    return { ticks, y, xy, line, area, xLabels }
  }, [points, goal, iw, ih, pad.l, pad.t])

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (!geo) return
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    let bd = Infinity
    geo.xy.forEach((p, i) => {
      const d = Math.abs(p.x - px)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    setActive(best)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!points.length) return
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length) - 1))
    else if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  if (!geo) {
    return (
      <div ref={ref} className="grid place-items-center rounded-2xl bg-white/[0.02] text-sm text-mute" style={{ height }}>
        Нет данных
      </div>
    )
  }

  const a = active !== null ? { p: points[active], xy: geo.xy[active] } : null
  const last = geo.xy[geo.xy.length - 1]
  const tipLeft = a ? Math.min(Math.max(a.xy.x - 70, 4), width - 144) : 0

  return (
    <div
      ref={ref}
      className="relative select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-2xl"
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={geo.y(t)} y2={geo.y(t)} stroke="#2a3037" strokeWidth={1} />
            <text x={pad.l - 8} y={geo.y(t) + 4} textAnchor="end" fontSize={11} fill="#6f7882" className="tabular">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {goal !== undefined && (
          <g>
            <line x1={pad.l} x2={width - pad.r} y1={geo.y(goal)} y2={geo.y(goal)} stroke="#a3acb6" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.7} />
            <text x={width - pad.r} y={geo.y(goal) - 6} textAnchor="end" fontSize={11} fill="#a3acb6">
              {goalLabel ?? 'цель'}
            </text>
          </g>
        )}
        {geo.area && <path d={geo.area} fill="url(#lc-fill)" />}
        {geo.xy.length > 1 && <path d={geo.line} fill="none" stroke="#2dd4bf" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {geo.xy.length <= 12 &&
          geo.xy.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2dd4bf" stroke="#1c2025" strokeWidth={2} />)}
        <circle cx={last.x} cy={last.y} r={5} fill="#2dd4bf" stroke="#1c2025" strokeWidth={2} />
        {!a && (
          <text x={Math.min(last.x, width - pad.r)} y={last.y - 11} textAnchor={last.x > width - 60 ? 'end' : 'middle'} fontSize={12} fontWeight={600} fill="#eef1f4" className="tabular">
            {fmtNum(points[points.length - 1].value)}
          </text>
        )}
        {geo.xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={height - 6}
            textAnchor={geo.xLabels.length === 1 ? 'middle' : i === 0 ? 'start' : i === geo.xLabels.length - 1 ? 'end' : 'middle'}
            fontSize={11}
            fill="#6f7882"
          >
            {l.text}
          </text>
        ))}
        {a && (
          <g pointerEvents="none">
            <line x1={a.xy.x} x2={a.xy.x} y1={pad.t} y2={pad.t + ih} stroke="#a3acb6" strokeWidth={1} opacity={0.5} />
            <circle cx={a.xy.x} cy={a.xy.y} r={5.5} fill="#2dd4bf" stroke="#1c2025" strokeWidth={2} />
          </g>
        )}
        <rect
          x={pad.l - 10}
          y={0}
          width={iw + 20}
          height={height}
          fill="transparent"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={pick}
          onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons ? pick(e) : undefined)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        />
      </svg>
      {a && (
        <div className="pointer-events-none absolute top-1 w-[140px] rounded-xl bg-raised px-3 py-2 shadow-lg ring-1 ring-white/10" style={{ left: tipLeft }}>
          <p className="tabular text-base font-semibold leading-tight">
            {a.p.detail ?? `${fmtNum(a.p.value)} ${unit}`}
          </p>
          <p className="text-xs text-mute">{fmtShort(a.p.date)} {parseISO(a.p.date).getFullYear()}</p>
        </div>
      )}
    </div>
  )
}
