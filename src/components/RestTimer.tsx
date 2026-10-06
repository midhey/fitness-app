import { useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import type { ActiveSession } from '../types'
import { actions } from '../store/store'
import { signal } from '../lib/feedback'
import { fmtClock } from '../lib/date'
import { Ring } from './ui'

export function RestTimer({ rest }: { rest: NonNullable<ActiveSession['rest']> }) {
  const [now, setNow] = useState(Date.now())
  const signalled = useRef<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const remaining = (rest.endsAt - now) / 1000
  const over = remaining <= 0

  useEffect(() => {
    if (over && signalled.current !== rest.endsAt) {
      signalled.current = rest.endsAt
      // Отдых давно закончился (экран был закрыт) — просто убираем таймер
      if (Date.now() - rest.endsAt > 20000) {
        actions.updateActive((a) => (a.rest && a.rest.endsAt === rest.endsAt ? { ...a, rest: null } : a))
        return
      }
      signal('done')
      const t = setTimeout(() => actions.updateActive((a) => (a.rest && a.rest.endsAt === rest.endsAt ? { ...a, rest: null } : a)), 6000)
      return () => clearTimeout(t)
    }
  }, [over, rest.endsAt])

  const shift = (sec: number) =>
    actions.updateActive((a) =>
      a.rest ? { ...a, rest: { ...a.rest, endsAt: Math.max(Date.now() + 1000, a.rest.endsAt + sec * 1000), total: Math.max(5, a.rest.total + sec) } } : a,
    )

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
      <div
        className={`mx-auto flex max-w-lg items-center gap-3 rounded-3xl px-3 py-3 shadow-2xl ring-1 backdrop-blur-xl ${
          over ? 'bg-accent text-accent-ink ring-accent' : 'bg-raised/95 ring-white/10'
        }`}
        role="timer"
        aria-live="polite"
      >
        <Ring value={over ? 1 : 1 - remaining / rest.total} size={54} stroke={5} color={over ? '#0b1716' : '#2dd4bf'}>
          <span className="tabular text-sm font-semibold">{over ? '✓' : fmtClock(remaining)}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{over ? 'Отдых окончен — следующий подход' : 'Отдых'}</p>
          <p className={`truncate text-xs ${over ? 'text-accent-ink/70' : 'text-mute'}`}>{rest.label}</p>
        </div>
        {!over && (
          <>
            <button type="button" onClick={() => shift(-15)} className="tabular h-10 rounded-xl bg-white/[0.07] px-2.5 text-sm font-semibold text-soft active:scale-95">
              −15
            </button>
            <button type="button" onClick={() => shift(15)} className="tabular h-10 rounded-xl bg-white/[0.07] px-2.5 text-sm font-semibold text-soft active:scale-95">
              +15
            </button>
          </>
        )}
        <button
          type="button"
          aria-label={over ? 'Закрыть' : 'Пропустить отдых'}
          onClick={() => actions.updateActive((a) => ({ ...a, rest: null }))}
          className={`grid size-10 place-items-center rounded-xl active:scale-95 ${over ? 'bg-black/15' : 'bg-white/[0.07] text-soft'}`}
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  )
}
