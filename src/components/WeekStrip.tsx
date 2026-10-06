import { Activity, Check, Moon } from 'lucide-react'
import type { AppState } from '../types'
import { addDays, parseISO, WEEKDAYS_SHORT } from '../lib/date'
import { SCHEDULE } from '../data/program'
import { dayStatus } from '../store/selectors'
import { cx } from './ui'

export function WeekStrip({
  state,
  monday,
  today,
  selected,
  onSelect,
}: {
  state: AppState
  monday: string
  today: string
  selected: string
  onSelect: (iso: string) => void
}) {
  // Силовая считается выполненной, если она сделана в любой день этой недели
  const weekEnd = addDays(monday, 6)
  const doneIds = new Set(state.workouts.filter((w) => w.date >= monday && w.date <= weekEnd).map((w) => w.workoutId))
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {SCHEDULE.map((plan, i) => {
        const iso = addDays(monday, i)
        const st = dayStatus(state, iso)
        const isToday = iso === today
        const isSel = iso === selected
        const done =
          (plan.kind === 'strength' && !!plan.workoutId && doneIds.has(plan.workoutId)) ||
          (plan.kind === 'cardio' && st.cardio.length > 0)
        const extra = st.strength.some((w) => plan.kind !== 'strength' || w.workoutId !== plan.workoutId)
        const past = iso < today
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-pressed={isSel}
            aria-label={`${WEEKDAYS_SHORT[i]} ${parseISO(iso).getDate()}: ${plan.title}${done ? ', выполнено' : ''}`}
            className={cx(
              'flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition',
              isSel ? 'bg-raised ring-1 ring-white/10' : 'bg-transparent',
            )}
          >
            <span className={cx('text-[11px] font-medium', isToday ? 'text-accent' : 'text-mute')}>{WEEKDAYS_SHORT[i]}</span>
            <span className={cx('tabular text-[15px] font-semibold', isToday ? 'text-ink' : past ? 'text-soft' : 'text-ink/80')}>
              {parseISO(iso).getDate()}
            </span>
            <span
              className={cx(
                'grid size-7 place-items-center rounded-full text-[11px] font-bold',
                done
                  ? plan.kind === 'cardio'
                    ? 'bg-cardio text-cardio-ink'
                    : 'bg-accent text-accent-ink'
                  : plan.kind === 'strength'
                    ? cx('ring-1 ring-inset', past ? 'text-mute ring-white/10' : 'text-accent ring-accent/40')
                    : plan.kind === 'cardio'
                      ? cx('ring-1 ring-inset', past ? 'text-mute ring-white/10' : 'text-cardio ring-cardio/40')
                      : 'text-mute/70',
              )}
            >
              {done ? (
                <Check size={14} strokeWidth={3} />
              ) : plan.kind === 'strength' ? (
                plan.workoutId
              ) : plan.kind === 'cardio' ? (
                <Activity size={13} />
              ) : (
                <Moon size={13} />
              )}
            </span>
            <span className="flex h-1.5 gap-1">
              {(st.posture || st.back) && <span className="h-1.5 w-3 rounded-full bg-mk-posture" title="Осанка" />}
              {extra && <span className="size-1.5 rounded-full bg-mk-strength" title="Силовая вне плана" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
