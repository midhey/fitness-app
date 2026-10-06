import { useMemo, useState } from 'react'
import { Activity, ChevronDown, Dumbbell, PersonStanding, Plus, Trash2 } from 'lucide-react'
import type { CardioLog, WorkoutLog } from '../types'
import { actions, useStore } from '../store/store'
import { doneSets, latestWeight, sortByDateDesc, totalSets, volumeOf } from '../store/selectors'
import { addDays, fmtLong, fmtMinutes, fmtShort, parseISO, todayISO } from '../lib/date'
import { toast } from '../lib/toast'
import { navigate } from '../lib/router'
import { EXERCISES, STRENGTH_ORDER } from '../data/exercises'
import { WORKOUTS } from '../data/program'
import { LineChart, type ChartPoint } from '../components/LineChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { WeightSheet } from '../components/WeightSheet'
import { Button, Card, Chip, Confirm, cx, SectionTitle, Segmented } from '../components/ui'

type Tab = 'weight' | 'log' | 'lifts'

let pendingTab: Tab | null = null
/** Открыть «Прогресс» на нужной вкладке */
export function openProgress(tab: Tab) {
  pendingTab = tab
  navigate('progress')
}
const kg = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')
const FEEL: Record<string, string> = { easy: 'легко', ok: 'нормально', hard: 'тяжело' }
const FEEL_CARDIO: Record<string, string> = { easy: 'легко', ok: 'умеренно', hard: 'тяжело' }

export function Progress() {
  const [tab, setTab] = useState<Tab>(() => {
    const t = pendingTab ?? 'weight'
    pendingTab = null
    return t
  })
  return (
    <div>
      <header className="pt-2">
        <h1 className="text-[26px] font-semibold tracking-tight">Прогресс</h1>
      </header>
      <Segmented
        className="mt-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'weight', label: 'Вес' },
          { value: 'log', label: 'Занятия' },
          { value: 'lifts', label: 'Рабочие веса' },
        ]}
      />
      <div className="mt-4">
        {tab === 'weight' && <WeightTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'lifts' && <LiftsTab />}
      </div>
    </div>
  )
}

// ---------- Вес ----------

function WeightTab() {
  const weights = useStore((s) => s.weights)
  const profile = useStore((s) => s.profile)
  const [range, setRange] = useState<'30' | '90' | 'all'>('90')
  const [open, setOpen] = useState(false)
  const [del, setDel] = useState<string | null>(null)
  const today = todayISO()
  const last = latestWeight(weights)
  const current = last?.kg ?? profile.startWeight
  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights])
  const from = range === 'all' ? '0000-00-00' : addDays(today, -Number(range))
  const points: ChartPoint[] = sorted.filter((w) => w.date >= from).map((w) => ({ date: w.date, value: w.kg }))
  const change = current - profile.startWeight
  const desc = [...sorted].reverse()

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Сейчас" value={`${kg(current)}`} unit="кг" />
        <Stat label="С начала" value={`${change > 0 ? '+' : change < 0 ? '−' : ''}${kg(Math.abs(change))}`} unit="кг" />
        <Stat label="До цели" value={current > profile.goalWeight ? kg(current - profile.goalWeight) : '0'} unit="кг" />
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">Вес, кг</p>
          <Segmented
            className="w-44"
            value={range}
            onChange={setRange}
            options={[
              { value: '30', label: '1М' },
              { value: '90', label: '3М' },
              { value: 'all', label: 'Всё' },
            ]}
          />
        </div>
        <LineChart
          points={points}
          goal={profile.goalWeight}
          goalLabel={`цель ${kg(profile.goalWeight)}`}
          unit="кг"
          ariaLabel={`График веса: ${points.length} записей, последняя ${kg(current)} кг, цель ${kg(profile.goalWeight)} кг`}
        />
        {points.length < 2 && (
          <p className="mt-2 text-sm text-mute">
            {points.length === 0 ? 'За этот период записей нет.' : 'Линия появится со второй записью. Взвешивайся 1–2 раза в неделю, утром, в одно и то же время.'}
          </p>
        )}
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setOpen(true)}>
          <Plus size={18} /> Записать вес
        </Button>
      </Card>

      <SectionTitle>История</SectionTitle>
      <Card className="p-2">
        {desc.length === 0 && <p className="p-3 text-sm text-mute">Записей пока нет.</p>}
        <ul className="divide-y divide-white/[0.05]">
          {desc.map((w, i) => {
            const prev = desc[i + 1]
            const d = prev ? w.kg - prev.kg : null
            return (
              <li key={w.id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="flex-1 text-[15px]">{fmtLong(w.date)}</span>
                {d !== null && (
                  <span className={cx('tabular text-sm', d < 0 ? 'text-accent-strong' : d > 0 ? 'text-soft' : 'text-mute')}>
                    {d > 0 ? '+' : d < 0 ? '−' : '±'}
                    {kg(Math.abs(d))}
                  </span>
                )}
                <span className="tabular w-16 text-right font-semibold">{kg(w.kg)} кг</span>
                <button type="button" onClick={() => setDel(w.id)} aria-label={`Удалить запись ${fmtShort(w.date)}`} className="grid size-9 place-items-center rounded-full text-mute active:bg-white/5">
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
      <WeightSheet open={open} onClose={() => setOpen(false)} />
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        title="Удалить запись веса?"
        confirmLabel="Удалить"
        danger
        onConfirm={() => {
          if (del) actions.deleteWeight(del)
          toast('Запись удалена')
        }}
      />
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-card px-3 py-3 ring-1 ring-white/[0.045]">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none">
        {value}
        <span className="ml-1 text-xs font-medium text-mute">{unit}</span>
      </p>
    </div>
  )
}

// ---------- Занятия ----------

type Entry = { kind: 'strength'; log: WorkoutLog; date: string } | { kind: 'cardio'; log: CardioLog; date: string }

function LogTab() {
  const state = useStore((s) => s)
  const today = todayISO()
  const t = parseISO(today)
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() })
  const [sel, setSel] = useState<string | null>(null)
  const [del, setDel] = useState<Entry | null>(null)

  const entries: Entry[] = useMemo(
    () =>
      sortByDateDesc<Entry>([
        ...state.workouts.map((log) => ({ kind: 'strength' as const, log, date: log.date })),
        ...state.cardio.map((log) => ({ kind: 'cardio' as const, log, date: log.date })),
      ]),
    [state.workouts, state.cardio],
  )

  const inMonth = (iso: string) => {
    const d = parseISO(iso)
    return d.getFullYear() === ym.y && d.getMonth() === ym.m
  }
  const mStrength = state.workouts.filter((w) => inMonth(w.date)).length
  const mCardio = state.cardio.filter((c) => inMonth(c.date)).length
  const mPosture = new Set(state.posture.filter((p) => inMonth(p.date)).map((p) => p.date)).size
  const shown = sel ? entries.filter((e) => e.date === sel) : entries

  const moveMonth = (d: number) => {
    setSel(null)
    setYm(({ y, m }) => {
      const nm = m + d
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }
    })
  }

  return (
    <div className="space-y-3">
      <Card>
        <MonthCalendar state={state} year={ym.y} month={ym.m} today={today} selected={sel} onSelect={(d) => setSel(sel === d ? null : d)} onMonth={moveMonth} />
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-4 text-center">
          <div>
            <p className="text-xl font-semibold">{mStrength}</p>
            <p className="text-xs text-mute">силовых</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{mCardio}</p>
            <p className="text-xs text-mute">кардио</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{mPosture}</p>
            <p className="text-xs text-mute">осанка</p>
          </div>
        </div>
      </Card>

      <SectionTitle
        action={
          sel && (
            <button type="button" onClick={() => setSel(null)} className="text-sm font-medium text-accent">
              Показать все
            </button>
          )
        }
      >
        {sel ? fmtLong(sel) : 'Журнал'}
      </SectionTitle>

      {sel &&
        state.posture
          .filter((p) => p.date === sel)
          .map((p) => (
            <Card key={p.complex ?? 'daily'} className="flex items-center gap-3 py-3">
              <span className="grid size-10 place-items-center rounded-xl bg-posture/12 text-posture">
                <PersonStanding size={19} />
              </span>
              <p className="flex-1 text-[15px]">
                {(p.complex ?? 'daily') === 'back' ? 'Спина и таз' : 'Комплекс для осанки'}{' '}
                <span className="text-mute">{p.steps < p.total ? `· ${p.steps} из ${p.total}` : '· полностью'}</span>
              </p>
            </Card>
          ))}

      {shown.length === 0 && (
        <Card>
          <p className="text-sm text-mute">{sel ? 'В этот день силовых и кардио нет.' : 'Журнал пуст. Завершённые тренировки и кардио появятся здесь.'}</p>
        </Card>
      )}

      <div className="space-y-2">
        {shown.map((e) => (e.kind === 'strength' ? <StrengthEntry key={e.log.id} log={e.log} onDelete={() => setDel(e)} /> : <CardioEntry key={e.log.id} log={e.log} onDelete={() => setDel(e)} />))}
      </div>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        title={del?.kind === 'strength' ? 'Удалить тренировку из журнала?' : 'Удалить запись кардио?'}
        text="Запись и её подходы исчезнут из истории и графиков."
        confirmLabel="Удалить"
        danger
        onConfirm={() => {
          if (!del) return
          if (del.kind === 'strength') actions.deleteWorkout(del.log.id)
          else actions.deleteCardio(del.log.id)
          toast('Запись удалена')
        }}
      />
    </div>
  )
}

function StrengthEntry({ log, onDelete }: { log: WorkoutLog; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const w = WORKOUTS[log.workoutId]
  const vol = volumeOf(log)
  return (
    <Card className="p-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/12 font-bold text-accent">{log.workoutId}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">
            {w.title} <span className="font-normal text-mute">· нед. {log.week}</span>
          </p>
          <p className="tabular mt-0.5 text-sm text-mute">
            {fmtShort(log.date)} · {fmtMinutes((log.finishedAt - log.startedAt) / 1000)} · {doneSets(log)}/{totalSets(log)} подх.
            {vol ? ` · ${vol} кг` : ''}
          </p>
        </div>
        <ChevronDown size={18} className={cx('shrink-0 text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
          <ul className="space-y-2.5">
            {log.exercises.map((ex, i) => {
              const d = ex.sets.filter((s) => s.done)
              return (
                <li key={i} className="text-[15px]">
                  <div className="flex justify-between gap-2">
                    <span>{EXERCISES[ex.exerciseId]?.short ?? ex.exerciseId}</span>
                    <span className="text-xs text-mute">план {ex.target}</span>
                  </div>
                  <p className="tabular text-sm text-soft">
                    {d.length ? d.map((s) => (s.weight ? `${kg(s.weight)}×${s.reps ?? '?'}` : `${s.reps ?? '?'} повт.`)).join(' · ') : 'не выполнено'}
                  </p>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {log.feeling && <Chip>ощущение: {FEEL[log.feeling]}</Chip>}
            {log.note && <p className="w-full text-sm text-soft">«{log.note}»</p>}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-danger" onClick={onDelete}>
            <Trash2 size={15} /> Удалить из журнала
          </Button>
        </div>
      )}
    </Card>
  )
}

function CardioEntry({ log, onDelete }: { log: CardioLog; onDelete: () => void }) {
  return (
    <Card className="flex items-center gap-3 py-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cardio/12 text-cardio">
        <Activity size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">
          Степпер · {log.minutes} мин <span className="font-normal text-mute">· нед. {log.week}</span>
        </p>
        <p className="mt-0.5 text-sm text-mute">
          {fmtShort(log.date)} · цель {log.targetMin} мин{log.feeling ? ` · ${FEEL_CARDIO[log.feeling]}` : ''}
        </p>
      </div>
      <button type="button" onClick={onDelete} aria-label="Удалить запись кардио" className="grid size-9 place-items-center rounded-full text-mute active:bg-white/5">
        <Trash2 size={16} />
      </button>
    </Card>
  )
}

// ---------- Рабочие веса ----------

function LiftsTab() {
  const workouts = useStore((s) => s.workouts)
  const history = useMemo(() => {
    const map = new Map<string, { date: string; sets: { weight: number | null; reps: number | null }[]; workoutId: string; week: number }[]>()
    for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt)) {
      for (const ex of w.exercises) {
        const d = ex.sets.filter((s) => s.done)
        if (!d.length) continue
        const arr = map.get(ex.exerciseId) ?? []
        arr.push({ date: w.date, sets: d, workoutId: w.workoutId, week: w.week })
        map.set(ex.exerciseId, arr)
      }
    }
    return map
  }, [workouts])
  const withData = STRENGTH_ORDER.filter((id) => history.has(id))
  const [sel, setSel] = useState<string>(withData[0] ?? STRENGTH_ORDER[0])
  const ex = EXERCISES[sel]
  const rows = history.get(sel) ?? []
  const bodyweight = ex.tracking === 'bodyweight'

  const best = (sets: { weight: number | null; reps: number | null }[]) =>
    sets.reduce(
      (b, s) => {
        const w = s.weight ?? 0
        const r = s.reps ?? 0
        return w > b.w || (w === b.w && r > b.r) ? { w, r } : b
      },
      { w: -1, r: -1 },
    )

  const points: ChartPoint[] = rows.map((r) => {
    const b = best(r.sets)
    const maxReps = Math.max(...r.sets.map((s) => s.reps ?? 0))
    return bodyweight || b.w <= 0
      ? { date: r.date, value: maxReps, detail: `${maxReps} повт.` }
      : { date: r.date, value: b.w, detail: `${kg(b.w)} кг × ${b.r}` }
  })
  const allTime = rows.reduce<{ w: number; r: number; date: string } | null>((acc, r) => {
    const b = best(r.sets)
    if (!acc || b.w > acc.w || (b.w === acc.w && b.r > acc.r)) return { ...b, date: r.date }
    return acc
  }, null)
  const unit = bodyweight || (allTime && allTime.w <= 0) ? 'повт.' : 'кг'

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STRENGTH_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSel(id)}
            aria-pressed={sel === id}
            className={cx(
              'h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition',
              sel === id ? 'bg-ink text-bg' : history.has(id) ? 'bg-white/[0.07] text-ink' : 'bg-white/[0.03] text-mute',
            )}
          >
            {EXERCISES[id].short}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{ex.name}</p>
            <p className="text-sm text-mute">
              {unit !== 'кг'
                ? 'Максимум повторений за тренировку'
                : ex.implement === 'pair'
                  ? 'Лучший подход, кг на одну гантель'
                  : ex.implement === 'barbell'
                    ? 'Лучший подход, кг (вся штанга)'
                    : 'Лучший подход тренировки, кг'}
            </p>
          </div>
          <Dumbbell size={18} className="mt-1 shrink-0 text-mute" />
        </div>
        {rows.length === 0 ? (
          <p className="mt-6 pb-4 text-center text-sm text-mute">Пока нет выполненных подходов. Данные появятся после первой тренировки с этим упражнением.</p>
        ) : (
          <>
            <div className="mt-3">
              <LineChart points={points} unit={unit} ariaLabel={`${ex.short}: ${points.length} тренировок`} height={180} />
            </div>
            {allTime && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-mute">Лучший результат</p>
                  <p className="mt-1 font-semibold">{allTime.w > 0 ? `${kg(allTime.w)} кг × ${allTime.r}` : `${Math.max(...rows.flatMap((r) => r.sets.map((s) => s.reps ?? 0)))} повт.`}</p>
                  <p className="text-xs text-mute">{fmtShort(allTime.date)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-mute">Тренировок</p>
                  <p className="mt-1 font-semibold">{rows.length}</p>
                  <p className="text-xs text-mute">с {fmtShort(rows[0].date)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {rows.length > 0 && (
        <>
          <SectionTitle>История подходов</SectionTitle>
          <Card className="p-2">
            <ul className="divide-y divide-white/[0.05]">
              {[...rows].reverse().map((r, i) => (
                <li key={i} className="flex items-baseline gap-3 px-2 py-2.5">
                  <span className="w-16 shrink-0 text-sm text-mute">{fmtShort(r.date)}</span>
                  <span className="tabular flex-1 text-[15px]">
                    {r.sets.map((s) => (s.weight ? `${kg(s.weight)}×${s.reps ?? '?'}` : `${s.reps ?? '?'}`)).join(' · ')}
                  </span>
                  <span className="text-xs text-mute">
                    {r.workoutId} · н{r.week}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
