import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AppState } from '../types'
import { MONTHS_NOM, parseISO, WEEKDAYS_SHORT } from '../lib/date'
import { dayStatus, isSameMonth, monthGrid } from '../store/selectors'
import { cx } from './ui'

/** Маркеры различаются и цветом, и формой: круг — силовая, ромб — кардио, полоска — осанка */
export function Markers({ strength, cardio, posture }: { strength: boolean; cardio: boolean; posture: boolean }) {
  return (
    <span className="flex h-2 items-center justify-center gap-[3px]">
      {strength && <span className="size-[7px] rounded-full bg-mk-strength" />}
      {cardio && <span className="size-[6px] rotate-45 rounded-[1px] bg-mk-cardio" />}
      {posture && <span className="h-[5px] w-[9px] rounded-full bg-mk-posture" />}
    </span>
  )
}

export function MonthCalendar({
  state,
  year,
  month,
  today,
  selected,
  onSelect,
  onMonth,
}: {
  state: AppState
  year: number
  month: number
  today: string
  selected: string | null
  onSelect: (iso: string) => void
  onMonth: (delta: number) => void
}) {
  const days = monthGrid(year, month)
  const rows = days.slice(35).some((d) => isSameMonth(d, year, month)) ? days : days.slice(0, 35)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => onMonth(-1)} aria-label="Предыдущий месяц" className="grid size-10 place-items-center rounded-full bg-white/[0.05] text-soft active:scale-95">
          <ChevronLeft size={18} />
        </button>
        <p className="font-semibold">
          {MONTHS_NOM[month]} {year}
        </p>
        <button type="button" onClick={() => onMonth(1)} aria-label="Следующий месяц" className="grid size-10 place-items-center rounded-full bg-white/[0.05] text-soft active:scale-95">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="pb-1 text-center text-[11px] font-medium text-mute">
            {d}
          </span>
        ))}
        {rows.map((iso) => {
          const inMonth = isSameMonth(iso, year, month)
          const st = dayStatus(state, iso)
          const anyPosture = !!st.posture || !!st.back
          const any = st.strength.length > 0 || st.cardio.length > 0 || anyPosture
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selected === iso}
              aria-label={`${parseISO(iso).getDate()} ${MONTHS_NOM[parseISO(iso).getMonth()]}${any ? ': есть занятия' : ''}`}
              className={cx(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl transition',
                selected === iso ? 'bg-raised ring-1 ring-white/15' : any && inMonth ? 'bg-white/[0.035]' : '',
                !inMonth && 'opacity-30',
              )}
            >
              <span className={cx('tabular text-[13px] font-medium', iso === today ? 'text-accent' : 'text-ink/85')}>{parseISO(iso).getDate()}</span>
              <Markers strength={st.strength.length > 0} cardio={st.cardio.length > 0} posture={anyPosture} />
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <Markers strength cardio={false} posture={false} /> силовая
        </span>
        <span className="flex items-center gap-1.5">
          <Markers strength={false} cardio posture={false} /> кардио
        </span>
        <span className="flex items-center gap-1.5">
          <Markers strength={false} cardio={false} posture /> осанка
        </span>
      </div>
    </div>
  )
}
