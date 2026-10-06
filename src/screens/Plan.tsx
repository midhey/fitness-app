import { useState } from 'react'
import { Activity, ChevronRight, Dumbbell, Moon, PenLine, Play, ShieldAlert } from 'lucide-react'
import type { WorkoutId } from '../types'
import { useStore } from '../store/store'
import { programWeek } from '../store/selectors'
import { todayISO, WEEKDAYS_SHORT } from '../lib/date'
import { navigate } from '../lib/router'
import { EXERCISES, STRENGTH_ORDER } from '../data/exercises'
import { BARBELL_IDS, BARBELL_NOTES, CARDIO_RULES, repsFor, repsLabel, SAFETY, SCHEDULE, setsFor, STEPPER_TECHNIQUE, TOTAL_WEEKS, WEEKS, WORKOUTS } from '../data/program'
import { ExerciseIllustration, StaticIllustration } from '../illustrations/ExerciseIllustration'
import { ExerciseSheet } from '../components/ExerciseInfo'
import { StartWorkoutGuard } from '../components/StartWorkoutGuard'
import { CardioLogSheet } from './Cardio'
import { Button, Card, Chip, cx, SectionTitle } from '../components/ui'

export function Plan() {
  const profile = useStore((s) => s.profile)
  const today = todayISO()
  const current = programWeek(profile, today)
  const [viewWeek, setViewWeek] = useState(current)
  const [exId, setExId] = useState<string | null>(null)
  const [start, setStart] = useState<{ id: WorkoutId; date: string } | null>(null)
  const [cardioLog, setCardioLog] = useState(false)
  const wp = WEEKS[viewWeek - 1]

  return (
    <div>
      <header className="pt-2">
        <h1 className="text-[26px] font-semibold tracking-tight">План</h1>
        <p className="mt-0.5 text-sm text-mute">8 недель · 3 силовые по 40–50 мин · 2 кардио · осанка ежедневно</p>
      </header>

      {/* Недели */}
      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {WEEKS.map((w) => (
          <button
            key={w.n}
            type="button"
            onClick={() => setViewWeek(w.n)}
            aria-pressed={viewWeek === w.n}
            className={cx(
              'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-1 transition',
              viewWeek === w.n ? 'bg-accent text-accent-ink ring-accent' : w.n === current ? 'bg-accent/10 text-accent ring-accent/30' : 'bg-card text-soft ring-white/[0.05]',
            )}
          >
            <span className="text-[10px] font-medium uppercase opacity-70">нед</span>
            <span className="tabular text-lg font-semibold leading-none">{w.n}</span>
          </button>
        ))}
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-accent">
            Неделя {wp.n} из {TOTAL_WEEKS}
            {wp.n === current && ' · текущая'}
          </p>
          <Chip>запас {wp.rir} повт.</Chip>
        </div>
        <h2 className="mt-1 text-xl font-semibold">
          {wp.phase}: {wp.summary.toLowerCase()}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-soft">{wp.details}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="accent">{wp.setsDelta < 0 ? 'на подход меньше' : wp.firstExerciseBonus ? '+1 подход в первом упражнении' : 'полный объём'}</Chip>
          <Chip tone="cardio">степпер 2 × {wp.cardioMin} мин</Chip>
        </div>
      </Card>

      <SectionTitle>Расписание недели</SectionTitle>
      <Card className="p-2">
        {SCHEDULE.map((d) => (
          <div key={d.weekday} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
            <span className="w-7 text-sm font-medium text-mute">{WEEKDAYS_SHORT[d.weekday]}</span>
            <span
              className={cx(
                'grid size-8 place-items-center rounded-xl text-sm font-bold',
                d.kind === 'strength' ? 'bg-accent/12 text-accent' : d.kind === 'cardio' ? 'bg-cardio/12 text-cardio' : 'bg-white/[0.05] text-mute',
              )}
            >
              {d.kind === 'strength' ? d.workoutId : d.kind === 'cardio' ? <Activity size={15} /> : <Moon size={15} />}
            </span>
            <span className="flex-1 text-[15px]">
              {d.title}
              {d.kind === 'cardio' && ` · ${wp.cardioMin} мин`}
            </span>
            <span className="text-xs text-mute">{d.note}</span>
          </div>
        ))}
        <p className="px-2 pb-2 pt-1 text-xs text-mute">Каждый день — комплекс для осанки (~11 мин), лучше отдельно от силовой.</p>
      </Card>

      {(['A', 'B', 'C'] as WorkoutId[]).map((id) => {
        const w = WORKOUTS[id]
        return (
          <div key={id}>
            <SectionTitle>
              {w.title} · {w.minutes}
            </SectionTitle>
            <Card className="p-2">
              <p className="px-2 pb-1 pt-1 text-sm text-soft">{w.focus}</p>
              {w.items.map((it, i) => {
                const ex = EXERCISES[it.exerciseId]
                return (
                  <button
                    key={it.exerciseId + i}
                    type="button"
                    onClick={() => setExId(it.exerciseId)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2 text-left active:bg-white/[0.03]"
                  >
                    <div className="w-16 shrink-0 overflow-hidden rounded-xl">
                      <StaticIllustration id={ex.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{ex.short}</p>
                      <p className="tabular text-sm text-mute">
                        {setsFor(it, i, viewWeek)} × {repsLabel(repsFor(it, viewWeek))}
                        {ex.perSide ? '/стор.' : ''} · отдых {it.restSec} с{ex.alt ? ' · или штанга' : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-mute" />
                  </button>
                )
              })}
              <div className="p-2">
                <Button className="w-full" onClick={() => setStart({ id, date: today })}>
                  <Play size={17} fill="currentColor" /> Начать {w.title}
                </Button>
              </div>
            </Card>
          </div>
        )
      })}

      <SectionTitle>Кардио на степпере</SectionTitle>
      <Card>
        <ExerciseIllustration id="stepper" />
        <div className="mt-4 grid grid-cols-8 gap-1">
          {WEEKS.map((w) => (
            <div key={w.n} className={cx('rounded-xl py-2 text-center', w.n === viewWeek ? 'bg-cardio/15 text-cardio' : 'bg-white/[0.03] text-soft')}>
              <p className="text-[10px] text-mute">н{w.n}</p>
              <p className="tabular text-sm font-semibold">{w.cardioMin}</p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-center text-xs text-mute">минут за занятие, 2 раза в неделю</p>
        <ul className="mt-4 space-y-2 text-[15px] text-soft">
          {CARDIO_RULES.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-cardio">•</span>
              {r}
            </li>
          ))}
        </ul>
        <p className="mb-2 mt-4 font-semibold">Техника и осанка</p>
        <ul className="space-y-2 text-[15px] text-soft">
          {STEPPER_TECHNIQUE.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-cardio">•</span>
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1 bg-cardio text-cardio-ink shadow-none" onClick={() => navigate('cardio')}>
            <Play size={17} fill="currentColor" /> Таймер
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setCardioLog(true)}>
            <PenLine size={17} /> Записать вручную
          </Button>
        </div>
      </Card>

      <SectionTitle>Гантели или штанга</SectionTitle>
      <Card>
        <div className="flex items-center gap-2">
          <Dumbbell size={18} className="text-accent" />
          <p className="font-semibold">Один набор дисков ≈ 20 кг на всё</p>
        </div>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-snug text-soft">
          {BARBELL_NOTES.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent">•</span>
              {n}
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {BARBELL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setExId(id)}
              className="overflow-hidden rounded-2xl bg-white/[0.03] text-left ring-1 ring-white/[0.05] active:scale-[0.98]"
            >
              <StaticIllustration id={id} />
              <p className="px-3 py-2 text-sm font-medium leading-tight">{EXERCISES[id].short}</p>
            </button>
          ))}
        </div>
      </Card>

      <SectionTitle>Все упражнения</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {STRENGTH_ORDER.filter((id) => EXERCISES[id].implement !== 'barbell').map((id) => (
          <button key={id} type="button" onClick={() => setExId(id)} className="overflow-hidden rounded-2xl bg-card text-left ring-1 ring-white/[0.045] active:scale-[0.98]">
            <StaticIllustration id={id} />
            <p className="px-3 py-2.5 text-sm font-medium leading-tight">{EXERCISES[id].short}</p>
          </button>
        ))}
      </div>

      <SectionTitle>Безопасность</SectionTitle>
      <Card className="bg-warn/[0.06] ring-warn/15">
        <div className="flex items-center gap-2 text-warn">
          <ShieldAlert size={18} />
          <p className="font-semibold">Перед началом и во время программы</p>
        </div>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-snug text-soft">
          {SAFETY.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-warn">•</span>
              {s}
            </li>
          ))}
        </ul>
      </Card>

      <ExerciseSheet id={exId} week={viewWeek} onClose={() => setExId(null)} onSwitch={setExId} />
      <StartWorkoutGuard request={start} onClose={() => setStart(null)} />
      <CardioLogSheet open={cardioLog} onClose={() => setCardioLog(false)} />
    </div>
  )
}
