import { useMemo, useState } from 'react'
import { Activity, Check, ChevronDown, ChevronRight, Dumbbell, Moon, PersonStanding, Play, Plus, Settings2, Timer, Waves } from 'lucide-react'
import type { WorkoutId, WorkoutLog } from '../types'
import { useStore } from '../store/store'
import { dayStatus, isComplex, latestWeight, postureStreak, postureThisWeek, programWeek, rawWeek, weeklyPace } from '../store/selectors'
import { addDays, fmtDayMonth, fmtShort, fmtLong, mondayOf, plural, todayISO, weekdayIdx, WEEKDAYS_FULL, WEEKDAYS_SHORT } from '../lib/date'
import { navigate } from '../lib/router'
import { EXERCISES } from '../data/exercises'
import { BACK_PER_WEEK, BACK_TOTAL_MIN, POSTURE_TOTAL_MIN } from '../data/posture'
import { repsFor, repsLabel, SCHEDULE, setsFor, TOTAL_WEEKS, weekPlan, WORKOUTS } from '../data/program'
import { Button, Card, Chip, cx, ProgressBar, SectionTitle } from '../components/ui'
import { WeekStrip } from '../components/WeekStrip'
import { WeightSheet } from '../components/WeightSheet'
import { ProfileSheet } from '../components/ProfileSheet'
import { StartWorkoutGuard } from '../components/StartWorkoutGuard'
import { openProgress } from './Progress'
import { openComplex } from './PostureSession'

const kgFmt = (n: number, d = 1) => n.toFixed(d).replace('.', ',')

export function Home() {
  const state = useStore((s) => s)
  const { profile, weights, active } = state
  const today = todayISO()
  const monday = mondayOf(today)
  const [selected, setSelected] = useState(today)
  const [weightOpen, setWeightOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [startId, setStartId] = useState<{ id: WorkoutId; date: string } | null>(null)

  const week = programWeek(profile, today)
  const raw = rawWeek(profile, today)
  const wp = weekPlan(week)
  const last = latestWeight(weights)
  const current = last?.kg ?? profile.startWeight
  const lost = profile.startWeight - current
  const toGo = current - profile.goalWeight
  const progress = (profile.startWeight - current) / (profile.startWeight - profile.goalWeight)
  const pace = weeklyPace(weights, today)
  const bmi = current / (profile.heightCm / 100) ** 2

  const selPlan = SCHEDULE[weekdayIdx(selected)]
  const selStatus = dayStatus(state, selected)
  const todayPosture = state.posture.find((p) => p.date === today && isComplex(p, 'daily'))
  const todayBack = state.posture.find((p) => p.date === today && isComplex(p, 'back'))
  const backWeek = postureThisWeek(state.posture, today, 'back')
  const todayIsStrength = SCHEDULE[weekdayIdx(today)].kind === 'strength'
  const streak = postureStreak(state.posture, today)

  const weekLogs = useMemo(
    () => state.workouts.filter((w) => w.date >= monday && w.date <= addDays(monday, 6)),
    [state.workouts, monday],
  )

  // Силовые этой недели, день которых уже прошёл, а тренировка не сделана
  const missed = useMemo(() => {
    const done = new Set(state.workouts.filter((w) => w.date >= monday && w.date <= addDays(monday, 6)).map((w) => w.workoutId))
    return SCHEDULE.filter((d) => d.kind === 'strength' && d.workoutId && addDays(monday, d.weekday) < today && !done.has(d.workoutId)).map(
      (d) => d.workoutId as WorkoutId,
    )
  }, [state.workouts, monday, today])

  const paceNote = (() => {
    if (pace === null) return { text: 'появится после двух взвешиваний с разницей от 7 дней', tone: 'mute' as const }
    const p = -pace
    if (p > 1) return { text: `−${kgFmt(p)} кг/нед — быстрее рекомендуемого. Не ускоряй снижение, чтобы сохранить мышцы`, tone: 'warn' as const }
    if (p >= 0.4) return { text: `−${kgFmt(p)} кг/нед — в рекомендуемом диапазоне`, tone: 'ok' as const }
    if (p > 0) return { text: `−${kgFmt(p)} кг/нед — медленнее ориентира 0,5–0,75`, tone: 'mute' as const }
    return { text: `+${kgFmt(-p)} кг/нед за последние недели`, tone: 'mute' as const }
  })()

  const eta = toGo > 0 ? `${Math.ceil(toGo / 0.75)}–${Math.ceil(toGo / 0.5)} нед.` : null

  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-mute">
            {raw > TOTAL_WEEKS ? 'Программа завершена' : `Неделя ${week} из ${TOTAL_WEEKS} · ${wp.phase}`}
          </p>
          <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight">{fmtLong(today)}</h1>
        </div>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Профиль и настройки"
          className="grid size-11 place-items-center rounded-full bg-white/[0.06] text-soft active:scale-95"
        >
          <Settings2 size={20} />
        </button>
      </header>

      {active && (
        <Card onClick={() => navigate('workout')} className="bg-accent/12 ring-accent/30">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-ink">
              <Timer size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{WORKOUTS[active.workoutId].title} не завершена</p>
              <p className="text-sm text-soft">
                Начата {Math.round((Date.now() - active.startedAt) / 60000)} мин назад · продолжить
              </p>
            </div>
            <ChevronRight className="text-accent" />
          </div>
        </Card>
      )}

      {raw > TOTAL_WEEKS && (
        <Card className="bg-accent/8">
          <p className="font-semibold">8 недель позади</p>
          <p className="mt-1 text-sm text-soft">
            Сравни рабочие веса на экране «Прогресс». Чтобы начать новый цикл, выбери неделю 1 в профиле — приложение подставит последние рабочие веса.
          </p>
        </Card>
      )}

      {/* Вес */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-mute">Текущий вес</p>
            <p className="mt-1 text-[44px] font-semibold leading-none tracking-tight">
              {kgFmt(current)}
              <span className="ml-1 text-lg font-medium text-mute">кг</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-mute">Цель</p>
            <p className="mt-1 text-2xl font-semibold text-accent">
              {kgFmt(profile.goalWeight, profile.goalWeight % 1 ? 1 : 0)}
              <span className="ml-1 text-sm font-medium text-mute">кг</span>
            </p>
          </div>
        </div>
        <ProgressBar value={progress} className="mt-4" />
        <div className="tabular mt-2 flex justify-between text-sm">
          <span className="text-soft">
            {Math.abs(lost) < 0.05
              ? `старт программы: ${kgFmt(profile.startWeight)} кг`
              : `${lost > 0 ? '−' : '+'}${kgFmt(Math.abs(lost))} кг с начала программы`}
          </span>
          <span className="text-mute">{toGo > 0 ? `осталось ${kgFmt(toGo)} кг` : 'цель достигнута'}</span>
        </div>
        <div className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-3 text-sm">
          <p className={cx(paceNote.tone === 'warn' ? 'text-warn' : paceNote.tone === 'ok' ? 'text-accent-strong' : 'text-mute')}>
            Темп: {paceNote.text}
          </p>
          <p className="text-mute">
            {profile.initialWeight && profile.initialWeight > profile.startWeight
              ? `До программы: ≈ −${kgFmt(profile.initialWeight - profile.startWeight, 0)} кг · `
              : ''}
            ИМТ {kgFmt(bmi)}
            {eta ? ` · при 0,5–0,75 кг/нед цель через ${eta}` : ''}
          </p>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setWeightOpen(true)}>
          <Plus size={18} /> Записать вес
        </Button>
      </Card>

      {/* Все три силовые недели */}
      <SectionTitle>Силовые на неделе</SectionTitle>
      <WeekWorkouts
        week={week}
        today={today}
        weekLogs={weekLogs}
        onStart={(id) => setStartId({ id, date: today })}
      />

      {/* Неделя */}
      <SectionTitle>Эта неделя</SectionTitle>
      <Card className="px-2 py-2">
        <WeekStrip state={state} monday={monday} today={today} selected={selected} onSelect={setSelected} />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pb-1.5 pt-1 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="grid size-3.5 place-items-center rounded-full bg-accent text-[8px] font-bold text-accent-ink">✓</span> выполнено
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-mk-posture" /> осанка
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-mk-strength" /> силовая вне плана
          </span>
        </div>
      </Card>

      {/* Выбранный день */}
      <DayCard
        date={selected}
        today={today}
        week={programWeek(profile, selected)}
        plan={selPlan}
        status={selStatus}
        weekLogs={weekLogs}
        missed={missed}
        onStart={(id) => setStartId({ id, date: today })}
      />

      {/* Осанка */}
      <Card onClick={() => (todayPosture ? navigate('posture') : openComplex('daily'))}>
        <div className="flex items-center gap-3">
          <span className={cx('grid size-12 place-items-center rounded-2xl', todayPosture ? 'bg-posture text-posture-ink' : 'bg-posture/12 text-posture')}>
            <PersonStanding size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Осанка · {POSTURE_TOTAL_MIN} мин</p>
            <p className="text-sm text-soft">
              {todayPosture ? 'Сегодня выполнено' : 'Ежедневный комплекс ещё не сделан'}
              {streak > 0 && ` · серия ${streak} ${plural(streak, 'день', 'дня', 'дней')}`}
            </p>
          </div>
          {todayPosture ? <Chip tone="posture">Готово</Chip> : <Play size={20} className="text-posture" />}
        </div>
      </Card>

      {/* Спина и таз — в дни без силовой */}
      {(!todayIsStrength || todayBack) && (
        <Card onClick={() => (todayBack ? navigate('posture') : openComplex('back'))}>
          <div className="flex items-center gap-3">
            <span className={cx('grid size-12 place-items-center rounded-2xl', todayBack ? 'bg-posture text-posture-ink' : 'bg-white/[0.06] text-posture')}>
              <Waves size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Спина и таз · {BACK_TOTAL_MIN} мин</p>
              <p className="text-sm text-soft">
                {todayBack ? 'Сегодня выполнено' : 'Подходящий день: нет силовой'} · {backWeek} из {BACK_PER_WEEK} на неделе
              </p>
            </div>
            {todayBack ? <Chip tone="posture">Готово</Chip> : <Play size={20} className="text-posture" />}
          </div>
        </Card>
      )}

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <StartWorkoutGuard request={startId} onClose={() => setStartId(null)} />
    </div>
  )
}

function WeekWorkouts({
  week,
  today,
  weekLogs,
  onStart,
}: {
  week: number
  today: string
  weekLogs: WorkoutLog[]
  onStart: (id: WorkoutId) => void
}) {
  const [open, setOpen] = useState<WorkoutId | null>(null)
  const todayId = SCHEDULE[weekdayIdx(today)].workoutId
  return (
    <div className="space-y-2">
      {(['A', 'B', 'C'] as WorkoutId[]).map((id) => {
        const w = WORKOUTS[id]
        const done = weekLogs.find((l) => l.workoutId === id)
        const day = SCHEDULE.find((d) => d.workoutId === id)!
        const isOpen = open === id
        return (
          <Card key={id} className={cx('p-0', todayId === id && !done && 'ring-accent/30')}>
            <div className="flex items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={cx(
                    'grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-bold',
                    done ? 'bg-accent text-accent-ink' : 'bg-accent/12 text-accent',
                  )}
                >
                  {done ? <Check size={18} strokeWidth={3} /> : id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold leading-tight">
                    {w.title}
                    {todayId === id && !done && (
                      <Chip tone="accent" className="px-2 py-0.5">
                        сегодня
                      </Chip>
                    )}
                    <ChevronDown size={16} className={cx('shrink-0 text-mute transition-transform', isOpen && 'rotate-180')} />
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-mute">
                    {WEEKDAYS_SHORT[day.weekday]} · {w.focus} · {w.items.length} упр.
                  </span>
                </span>
              </button>
              {done ? (
                <span className="shrink-0 text-sm font-medium text-accent">{fmtShort(done.date)}</span>
              ) : (
                <Button size="sm" className="shrink-0" onClick={() => onStart(id)} aria-label={`Начать ${w.title}`}>
                  <Play size={14} fill="currentColor" /> Старт
                </Button>
              )}
            </div>
            {isOpen && (
              <ul className="divide-y divide-white/[0.05] border-t border-white/[0.05] px-4 pb-2">
                {w.items.map((it, i) => (
                  <li key={it.exerciseId + i} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="tabular w-4 shrink-0 text-xs text-mute">{i + 1}</span>
                      <span className="truncate">{EXERCISES[it.exerciseId].short}</span>
                    </span>
                    <span className="tabular shrink-0 text-sm text-soft">
                      {setsFor(it, i, week)} × {repsLabel(repsFor(it, week))}
                      {EXERCISES[it.exerciseId].perSide ? '/стор.' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )
      })}
      <p className="px-1 text-xs text-mute">
        Нажми на тренировку, чтобы увидеть упражнения. Между силовыми — день отдыха или кардио.
      </p>
    </div>
  )
}

function DayCard({
  date,
  today,
  week,
  plan,
  status,
  weekLogs,
  missed,
  onStart,
}: {
  date: string
  today: string
  week: number
  plan: (typeof SCHEDULE)[number]
  status: ReturnType<typeof dayStatus>
  weekLogs: WorkoutLog[]
  missed: WorkoutId[]
  onStart: (id: WorkoutId) => void
}) {
  const isToday = date === today
  const future = date > today
  const label = isToday ? 'Сегодня' : `${WEEKDAYS_FULL[weekdayIdx(date)][0].toUpperCase()}${WEEKDAYS_FULL[weekdayIdx(date)].slice(1)}, ${fmtDayMonth(date)}`
  const wp = weekPlan(week)

  if (plan.kind === 'strength' && plan.workoutId) {
    const w = WORKOUTS[plan.workoutId]
    // Тренировка этой недели могла быть сделана в другой день
    const done = weekLogs.find((s) => s.workoutId === plan.workoutId)
    return (
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-accent">{label}</p>
          <Chip>{w.minutes}</Chip>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent/12 text-lg font-bold text-accent">{w.id}</span>
          <div>
            <h3 className="text-xl font-semibold leading-tight">{w.title}</h3>
            <p className="text-sm text-soft">{w.focus}</p>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-white/[0.05]">
          {w.items.map((it, i) => (
            <li key={it.exerciseId + i} className="flex items-center justify-between py-2.5 text-[15px]">
              <span className="flex items-center gap-2.5">
                <span className="tabular w-4 text-xs text-mute">{i + 1}</span>
                {EXERCISES[it.exerciseId].short}
              </span>
              <span className="tabular text-sm text-soft">
                {setsFor(it, i, week)} × {repsLabel(repsFor(it, week))}
                {EXERCISES[it.exerciseId].perSide ? '/стор.' : ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-mute">
          Неделя {week}: {wp.summary.toLowerCase()}, запас {wp.rir} повт.
        </p>
        {done ? (
          <Button variant="secondary" className="mt-4 w-full" onClick={() => openProgress('log')}>
            <Dumbbell size={18} /> Выполнено{done.date !== date ? ` ${fmtShort(done.date)}` : ''} · журнал
          </Button>
        ) : (
          <Button size="lg" className="mt-4 w-full" onClick={() => onStart(w.id)}>
            <Play size={18} fill="currentColor" /> {future ? 'Начать сейчас' : 'Начать тренировку'}
          </Button>
        )}
        {future && !done && <p className="mt-2 text-center text-xs text-mute">Запланировано на {fmtDayMonth(date)}. Если начнёшь сейчас, тренировка запишется на сегодня.</p>}
      </Card>
    )
  }

  if (plan.kind === 'cardio') {
    const done = status.cardio[0]
    return (
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-cardio">{label}</p>
          <Chip tone="cardio">{wp.cardioMin} мин</Chip>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-cardio/12 text-cardio">
            <Activity size={22} />
          </span>
          <div>
            <h3 className="text-xl font-semibold leading-tight">Степпер</h3>
            <p className="text-sm text-soft">Умеренно, 5–6 из 10 — можно говорить фразами</p>
          </div>
        </div>
        {done ? (
          <Button variant="secondary" className="mt-4 w-full" onClick={() => openProgress('log')}>
            Выполнено: {done.minutes} мин · журнал
          </Button>
        ) : (
          <Button size="lg" className="mt-4 w-full bg-cardio text-cardio-ink shadow-none" onClick={() => navigate('cardio')}>
            <Play size={18} fill="currentColor" /> Начать кардио
          </Button>
        )}
        {status.strength.length === 0 && missed.length > 0 && !done && isToday && (
          <Button variant="ghost" className="mt-1 w-full" onClick={() => onStart(missed[0])}>
            Сделать пропущенную силовую {missed[0]} вместо кардио
          </Button>
        )}
      </Card>
    )
  }

  const next = missed[0]
  return (
    <Card>
      <p className="text-sm font-medium text-soft">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-soft">
          <Moon size={22} />
        </span>
        <div>
          <h3 className="text-xl font-semibold leading-tight">День отдыха</h3>
          <p className="text-sm text-soft">{plan.note}. Восстановление — часть программы.</p>
        </div>
      </div>
      <Button size="lg" className="mt-4 w-full bg-posture text-posture-ink shadow-none" onClick={() => openComplex('daily')}>
        <PersonStanding size={19} /> Комплекс для осанки
      </Button>
      {status.strength.length > 0 ? (
        <p className="mt-2 text-center text-xs text-mute">В этот день уже была силовая тренировка.</p>
      ) : (
        next &&
        isToday && (
          <Button variant="ghost" className="mt-1 w-full" onClick={() => onStart(next)}>
            Сделать пропущенную силовую {next}
          </Button>
        )
      )}
    </Card>
  )
}
