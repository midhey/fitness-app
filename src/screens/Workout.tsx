import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Info, List, MoreHorizontal, Plus, TrendingUp, Trash2 } from 'lucide-react'
import type { ActiveSession, DraftSet, Feeling, WorkoutItem } from '../types'
import { actions, lastLogFor, useStore } from '../store/store'
import { EXERCISES } from '../data/exercises'
import { repsFor, repsLabel, WARMUP, weekPlan, WORKOUTS } from '../data/program'
import { fmtClock, fmtMinutes, fmtShort } from '../lib/date'
import { goBack, navigate } from '../lib/router'
import { unlockAudio, useWakeLock } from '../lib/feedback'
import { toast } from '../lib/toast'
import { ExerciseIllustration, StaticIllustration } from '../illustrations/ExerciseIllustration'
import { Collapsible, Mistakes, MuscleChips, Steps } from '../components/ExerciseInfo'
import { RestTimer } from '../components/RestTimer'
import { Button, Card, Chip, Confirm, cx, Segmented, Sheet } from '../components/ui'
import { loadFactor } from '../store/selectors'

const fmtKg = (w: number | null) => (w == null ? '—' : String(w).replace('.', ','))

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="tabular">{fmtClock((now - since) / 1000)}</span>
}

export function Workout() {
  const active = useStore((s) => s.active)
  const workouts = useStore((s) => s.workouts)
  const [menu, setMenu] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [overview, setOverview] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  useWakeLock(!!active)

  const current = active?.current ?? -1
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [current])

  if (!active) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Тренировка не начата</p>
        <p className="max-w-xs text-sm text-mute">Выбери тренировку на главном экране или в «Плане».</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('home', { replace: true })}>
            На главную
          </Button>
          <Button onClick={() => navigate('plan', { replace: true })}>К плану</Button>
        </div>
      </div>
    )
  }

  const w = WORKOUTS[active.workoutId]
  const wp = weekPlan(active.week)
  const setCurrent = (i: number) => actions.updateActive((a) => ({ ...a, current: i }))
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0)
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  return (
    <div ref={topRef} className={cx('pb-6', active.rest && 'pb-28')}>
      {/* Шапка */}
      <header className="safe-top sticky top-0 z-30 -mx-4 bg-bg/90 px-4 pb-2 pt-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goBack('home')}
            aria-label="Свернуть тренировку"
            className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-soft active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{w.title}</p>
            <p className="text-xs text-mute">
              Неделя {active.week} · {wp.phase} · запас {wp.rir}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold leading-none text-accent">
              <Elapsed since={active.startedAt} />
            </p>
            <p className="tabular mt-0.5 text-[11px] text-mute">
              {done}/{total} подх.
            </p>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Меню тренировки" className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-soft active:scale-95">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Шаги */}
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <StepChip label="Разминка" active={current === -1} done={active.warmup.every(Boolean)} onClick={() => setCurrent(-1)} />
          {active.exercises.map((ex, i) => {
            const d = ex.sets.every((s) => s.done)
            const part = ex.sets.some((s) => s.done)
            return (
              <StepChip
                key={i}
                label={String(i + 1)}
                title={EXERCISES[ex.exerciseId].short}
                active={current === i}
                done={d}
                partial={part && !d}
                onClick={() => setCurrent(i)}
              />
            )
          })}
          <button
            type="button"
            onClick={() => setOverview(true)}
            className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-sm text-soft"
          >
            <List size={15} /> Все
          </button>
        </div>
      </header>

      <div className="mt-3">
        {current === -1 ? (
          <Warmup active={active} onNext={() => setCurrent(0)} />
        ) : (
          <ExerciseStep
            key={current}
            active={active}
            index={current}
            item={w.items[current]}
            lastLog={lastLogFor(workouts, active.exercises[current].exerciseId)}
            onPrev={() => setCurrent(current - 1)}
            onNext={() => (current < active.exercises.length - 1 ? setCurrent(current + 1) : setFinishOpen(true))}
          />
        )}
      </div>

      {active.rest && <RestTimer rest={active.rest} />}

      {/* Обзор */}
      <Sheet open={overview} onClose={() => setOverview(false)} title={`${w.title}: все упражнения`}>
        <div className="space-y-2">
          {active.exercises.map((ex, i) => {
            const e = EXERCISES[ex.exerciseId]
            const it = w.items[i]
            const d = ex.sets.filter((s) => s.done).length
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCurrent(i)
                  setOverview(false)
                }}
                className={cx('flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left ring-1', i === current ? 'bg-raised ring-accent/40' : 'bg-white/[0.03] ring-white/[0.04]')}
              >
                <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                  <StaticIllustration id={e.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {i + 1}. {e.short}
                  </p>
                  <p className="tabular text-sm text-mute">
                    {ex.sets.length} × {repsLabel(repsFor(it, active.week))}
                    {e.perSide ? ' на сторону' : ''} · отдых {it.restSec} с
                  </p>
                </div>
                <span className={cx('tabular text-sm font-semibold', d === ex.sets.length ? 'text-accent' : 'text-mute')}>
                  {d}/{ex.sets.length}
                </span>
              </button>
            )
          })}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            setOverview(false)
            setFinishOpen(true)
          }}
        >
          Завершить тренировку
        </Button>
      </Sheet>

      {/* Меню */}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Тренировка">
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => {
              setMenu(false)
              setFinishOpen(true)
            }}
          >
            <Check size={18} /> Завершить и сохранить
          </Button>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              setMenu(false)
              setConfirmDiscard(true)
            }}
          >
            <Trash2 size={18} /> Отменить без сохранения
          </Button>
          <p className="pt-1 text-center text-xs text-mute">Черновик сохраняется автоматически — можно свернуть и вернуться позже.</p>
        </div>
      </Sheet>

      <Confirm
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Удалить тренировку?"
        text="Отмеченные подходы и введённые веса не сохранятся в журнале."
        confirmLabel="Удалить"
        danger
        onConfirm={() => {
          actions.discardWorkout()
          toast('Тренировка удалена')
          goBack('home')
        }}
      />

      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} active={active} />
    </div>
  )
}

function StepChip({
  label,
  title,
  active,
  done,
  partial,
  onClick,
}: {
  label: string
  title?: string
  active: boolean
  done: boolean
  partial?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title ? `Упражнение ${label}: ${title}` : label}
      aria-current={active ? 'step' : undefined}
      className={cx(
        'flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold transition',
        label.length === 1 && 'w-9 px-0',
        active ? 'bg-ink text-bg' : done ? 'bg-accent/15 text-accent' : partial ? 'bg-white/[0.08] text-ink' : 'bg-white/[0.05] text-mute',
      )}
    >
      {done && !active ? <Check size={15} strokeWidth={3} /> : label}
    </button>
  )
}

function Warmup({ active, onNext }: { active: ActiveSession; onNext: () => void }) {
  const toggle = (i: number) =>
    actions.updateActive((a) => ({ ...a, warmup: a.warmup.map((v, k) => (k === i ? !v : v)) }))
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">Разминка</h2>
        <p className="mt-1 text-sm text-soft">5–7 минут. Разогреть суставы и мышцы, не устать.</p>
      </div>
      <Card className="p-2">
        {WARMUP.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={active.warmup[i]}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-white/[0.03]"
          >
            <span className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-inset transition', active.warmup[i] ? 'bg-accent text-accent-ink ring-accent' : 'ring-white/15')}>
              {active.warmup[i] && <Check size={15} strokeWidth={3} />}
            </span>
            <span className={cx('text-[15px]', active.warmup[i] && 'text-mute line-through decoration-white/20')}>{item}</span>
          </button>
        ))}
      </Card>
      <Button size="lg" className="w-full" onClick={onNext}>
        К первому упражнению <ChevronRight size={18} />
      </Button>
    </div>
  )
}

function summarizeSets(sets: { weight: number | null; reps: number | null; done: boolean }[]) {
  const d = sets.filter((s) => s.done)
  if (!d.length) return ''
  const ws = new Set(d.map((s) => s.weight ?? 0))
  if (ws.size === 1) {
    const w = d[0].weight
    return `${w ? `${fmtKg(w)} кг × ` : ''}${d.map((s) => s.reps ?? '?').join(', ')}`
  }
  return d.map((s) => `${fmtKg(s.weight)}×${s.reps ?? '?'}`).join(', ')
}

function ExerciseStep({
  active,
  index,
  item,
  lastLog,
  onPrev,
  onNext,
}: {
  active: ActiveSession
  index: number
  item: WorkoutItem
  lastLog: ReturnType<typeof lastLogFor>
  onPrev: () => void
  onNext: () => void
}) {
  const draft = active.exercises[index]
  const ex = EXERCISES[draft.exerciseId]
  const reps = repsFor(item, active.week)
  const wp = weekPlan(active.week)
  const note = ex.weekNotes?.[active.week]
  const isLast = index === active.exercises.length - 1
  const weighted = ex.tracking !== 'bodyweight'
  const weightLabel = !weighted ? 'Вес' : ex.implement === 'pair' ? 'Гантель, кг' : ex.implement === 'barbell' ? 'Штанга, кг' : 'Вес, кг'

  const lastDone = lastLog?.ex.sets.filter((s) => s.done) ?? []
  const canAdd =
    weighted &&
    lastDone.length >= 2 &&
    lastDone.every((s) => (s.reps ?? 0) >= reps[1]) &&
    wp.setsDelta === 0 &&
    active.week !== 1

  const setField = (k: number, patch: Partial<DraftSet>) =>
    actions.updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i === index ? { ...e, sets: e.sets.map((s, j) => (j === k ? { ...s, ...patch } : s)) } : e)),
    }))

  // Вес предыдущего подхода в этой тренировке — самый вероятный вес следующего
  const prevDraftWeight = (k: number) => {
    for (let j = k - 1; j >= 0; j--) if (draft.sets[j].weight.trim()) return draft.sets[j].weight
    return null
  }
  const lastWeight = (k: number) => {
    const ls = lastDone[Math.min(k, lastDone.length - 1)]
    return ls?.weight != null ? fmtKg(ls.weight) : null
  }
  const placeholderWeight = (k: number) =>
    prevDraftWeight(k) ?? lastWeight(k) ?? (ex.tracking === 'optionalWeight' ? '0' : 'кг')
  const placeholderReps = (k: number) => {
    const ls = lastDone[Math.min(k, lastDone.length - 1)]
    return String(ls?.reps ?? reps[0])
  }

  const toggleDone = (k: number) => {
    unlockAudio()
    const s = draft.sets[k]
    if (s.done) {
      setField(k, { done: false })
      return
    }
    const weight = s.weight.trim() !== '' ? s.weight : weighted ? (prevDraftWeight(k) ?? lastWeight(k) ?? '') : ''
    const r = s.reps.trim() !== '' ? s.reps : placeholderReps(k)
    const allDoneAfter = draft.sets.every((x, j) => (j === k ? true : x.done))
    actions.updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) =>
        i === index ? { ...e, sets: e.sets.map((x, j) => (j === k ? { ...x, done: true, weight: weight.replace('.', ','), reps: r } : x)) } : e,
      ),
      rest:
        allDoneAfter && isLast
          ? null
          : {
              endsAt: Date.now() + item.restSec * 1000,
              total: item.restSec,
              label: allDoneAfter ? `Дальше: ${nextName(a, index)}` : `${ex.short} · подход ${k + 2} из ${draft.sets.length}`,
            },
    }))
  }

  const addSet = () =>
    actions.updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i === index ? { ...e, sets: [...e.sets, { weight: e.sets[e.sets.length - 1]?.weight ?? '', reps: '', done: false }] } : e)),
    }))
  const removeSet = () =>
    actions.updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => (i === index && e.sets.length > 1 ? { ...e, sets: e.sets.slice(0, -1) } : e)),
    }))

  const allDone = draft.sets.every((s) => s.done)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-accent">
          Упражнение {index + 1} из {active.exercises.length}
        </p>
        <h2 className="mt-0.5 text-[22px] font-semibold leading-tight">{ex.name}</h2>
        {ex.alt && (
          <div className="mt-3">
            <Segmented
              value={ex.implement === 'barbell' ? 'barbell' : 'dumbbell'}
              onChange={(v) => {
                if ((v === 'barbell') === (ex.implement === 'barbell')) return
                if (draft.sets.some((st) => st.done)) {
                  toast('Сначала сними отметки подходов — потом меняй снаряд')
                  return
                }
                actions.swapExercise(index, ex.alt!)
              }}
              options={[
                { value: 'dumbbell', label: 'Гантели' },
                { value: 'barbell', label: 'Штанга' },
              ]}
            />
            <p className="mt-1.5 px-1 text-xs text-mute">
              {ex.implement === 'barbell'
                ? 'Штанга собирается из тех же дисков. Как поднять её с пола и уложить — в технике ниже.'
                : 'Можно выполнить со штангой — те же диски, собранные на гриф.'}
            </p>
          </div>
        )}
      </div>

      <ExerciseIllustration id={ex.id} />

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="accent">
          {draft.sets.length} × {repsLabel(reps)}
          {ex.perSide ? ' на сторону' : ''}
        </Chip>
        <Chip>отдых {item.restSec} с</Chip>
        <Chip>запас {wp.rir} повт.</Chip>
      </div>

      <MuscleChips primary={ex.primary} secondary={ex.secondary} />

      {note && (
        <div className="flex gap-2.5 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent-strong">
          <TrendingUp size={17} className="mt-px shrink-0" />
          <span>
            <b className="font-semibold">Неделя {active.week}:</b> {note}
          </span>
        </div>
      )}

      {lastLog && (
        <div className={cx('rounded-2xl px-4 py-3 text-sm', canAdd ? 'bg-accent/10 text-accent-strong' : 'bg-white/[0.04] text-soft')}>
          <p>
            Прошлый раз, {fmtShort(lastLog.log.date)}: <span className="tabular font-medium">{summarizeSets(lastLog.ex.sets)}</span>
          </p>
          {canAdd && <p className="mt-1 font-medium">Все подходы на верхней границе — добавь 1–2 кг или используй вариант недели.</p>}
        </div>
      )}

      {/* Подходы */}
      <Card className="p-3">
        <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 px-1 pb-2 text-xs font-medium text-mute">
          <span>#</span>
          <span>{weightLabel}</span>
          <span>Повторы{ex.perSide ? ' / стор.' : ''}</span>
          <span className="text-center">Готово</span>
        </div>
        <div className="space-y-2">
          {draft.sets.map((s, k) => (
            <div key={k} className={cx('grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl p-1 transition', s.done && 'bg-accent/[0.07]')}>
              <span className="tabular text-center text-sm font-semibold text-mute">{k + 1}</span>
              {weighted ? (
                <input
                  value={s.weight}
                  onChange={(e) => setField(k, { weight: e.target.value.replace(/[^\d.,]/g, '') })}
                  inputMode="decimal"
                  placeholder={placeholderWeight(k)}
                  aria-label={`Вес, подход ${k + 1}`}
                  className="tabular h-12 w-full min-w-0 rounded-xl bg-white/[0.05] text-center text-lg font-semibold outline-none ring-1 ring-transparent placeholder:text-mute/60 focus:ring-accent"
                />
              ) : (
                <span className="text-center text-sm text-mute">своё тело</span>
              )}
              <input
                value={s.reps}
                onChange={(e) => setField(k, { reps: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                inputMode="numeric"
                placeholder={placeholderReps(k)}
                aria-label={`Повторения, подход ${k + 1}`}
                className="tabular h-12 w-full min-w-0 rounded-xl bg-white/[0.05] text-center text-lg font-semibold outline-none ring-1 ring-transparent placeholder:text-mute/60 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => toggleDone(k)}
                aria-pressed={s.done}
                aria-label={s.done ? `Подход ${k + 1} выполнен, отменить` : `Отметить подход ${k + 1}`}
                className={cx(
                  'grid size-12 place-items-center rounded-xl transition active:scale-90',
                  s.done ? 'animate-pop bg-accent text-accent-ink' : 'bg-white/[0.06] text-mute ring-1 ring-inset ring-white/10',
                )}
              >
                <Check size={22} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between px-1">
          <button type="button" onClick={removeSet} disabled={draft.sets.length <= 1} className="h-9 rounded-xl px-2 text-sm text-mute disabled:opacity-40">
            − подход
          </button>
          <button type="button" onClick={addSet} className="flex h-9 items-center gap-1 rounded-xl px-2 text-sm text-soft">
            <Plus size={15} /> подход
          </button>
        </div>
        <p className="px-1 pt-1 text-xs text-mute">
          Пустые поля при отметке заполняются подсказкой (прошлый результат или нижняя граница). Галочка запускает таймер отдыха.
        </p>
      </Card>

      <div>
        <h3 className="mb-2 font-semibold">Техника</h3>
        <p className="mb-3 text-[15px] leading-snug text-soft">{ex.setup}</p>
        <Steps steps={ex.steps} />
        {ex.tips?.map((t, i) => (
          <div key={i} className="mt-3 flex gap-2.5 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-soft">
            <Info size={16} className="mt-0.5 shrink-0 text-mute" />
            <span>{t}</span>
          </div>
        ))}
      </div>
      <Collapsible title="Типичные ошибки">
        <Mistakes items={ex.mistakes} />
      </Collapsible>
      <Collapsible title="Прогрессия при упоре в вес">
        <ul className="space-y-1.5 text-[15px] text-soft">
          {ex.progression.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent">→</span>
              {p}
            </li>
          ))}
        </ul>
      </Collapsible>

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" size="lg" onClick={onPrev} aria-label="Предыдущий шаг" className="px-4">
          <ChevronLeft size={20} />
        </Button>
        <Button size="lg" variant={allDone ? 'primary' : 'secondary'} className="flex-1" onClick={onNext}>
          {isLast ? 'Завершить тренировку' : 'Следующее упражнение'} <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  )
}

function nextName(a: ActiveSession, index: number) {
  const n = a.exercises[index + 1]
  return n ? EXERCISES[n.exerciseId].short : 'завершение'
}

function FinishSheet({ open, onClose, active }: { open: boolean; onClose: () => void; active: ActiveSession }) {
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [note, setNote] = useState('')
  const stats = useMemo(() => {
    let done = 0
    let total = 0
    let vol = 0
    for (const e of active.exercises)
      for (const s of e.sets) {
        total++
        if (s.done) {
          done++
          const w = Number(s.weight.replace(',', '.'))
          const r = Number(s.reps)
          if (w > 0 && r > 0) vol += w * r * loadFactor(e.exerciseId)
        }
      }
    return { done, total, vol: Math.round(vol) }
  }, [active])
  const minutes = fmtMinutes((Date.now() - active.startedAt) / 1000)

  const save = () => {
    actions.finishWorkout(feeling, note.trim())
    toast('Тренировка сохранена в журнал')
    goBack('home')
  }

  const options: { v: Feeling; label: string; hint: string }[] = [
    { v: 'easy', label: 'Легко', hint: 'запас больше 3' },
    { v: 'ok', label: 'Нормально', hint: 'запас 2–3' },
    { v: 'hard', label: 'Тяжело', hint: 'запас 0–1' },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Завершить тренировку"
      footer={
        <Button size="lg" className="w-full" onClick={save} disabled={stats.done === 0}>
          Сохранить в журнал
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: minutes, l: 'время' },
          { v: `${stats.done}/${stats.total}`, l: 'подходов' },
          { v: stats.vol ? `${stats.vol} кг` : '—', l: 'тоннаж' },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl bg-white/[0.04] p-3 text-center">
            <p className="tabular text-lg font-semibold">{x.v}</p>
            <p className="text-xs text-mute">{x.l}</p>
          </div>
        ))}
      </div>
      {stats.done === 0 && <p className="mt-3 text-sm text-warn">Не отмечено ни одного подхода — сохранять нечего.</p>}
      {stats.done > 0 && stats.done < stats.total && (
        <p className="mt-3 text-sm text-mute">Не все подходы отмечены — сохранятся только выполненные.</p>
      )}
      <p className="mb-2 mt-5 text-sm font-medium text-soft">Как ощущалась нагрузка?</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setFeeling(feeling === o.v ? null : o.v)}
            aria-pressed={feeling === o.v}
            className={cx('rounded-2xl px-2 py-3 text-center ring-1 transition', feeling === o.v ? 'bg-accent/15 ring-accent text-ink' : 'bg-white/[0.03] ring-white/[0.06] text-soft')}
          >
            <span className="block font-semibold">{o.label}</span>
            <span className="text-xs text-mute">{o.hint}</span>
          </button>
        ))}
      </div>
      {feeling === 'easy' && <p className="mt-2 text-sm text-mute">В следующий раз можно добавить повторения или вес.</p>}
      {feeling === 'hard' && <p className="mt-2 text-sm text-mute">В следующий раз оставь те же веса и следи за запасом 2–3 повторения.</p>}
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-soft">Заметка (необязательно)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="Например: колено ок, в жиме тяжело на 3-м подходе"
          className="w-full resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none ring-1 ring-line placeholder:text-mute/60 focus:ring-accent"
        />
      </label>
      <p className="mt-3 text-xs text-mute">После тренировки — 2–3 минуты спокойной ходьбы и дыхания.</p>
    </Sheet>
  )
}
