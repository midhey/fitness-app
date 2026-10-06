import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, Square } from 'lucide-react'
import type { Feeling } from '../types'
import { actions, getState, useStore } from '../store/store'
import { programWeek } from '../store/selectors'
import { fmtClock, fmtShort, todayISO } from '../lib/date'
import { goBack } from '../lib/router'
import { signal, unlockAudio, useWakeLock } from '../lib/feedback'
import { toast } from '../lib/toast'
import { weekPlan, STEPPER_TECHNIQUE } from '../data/program'
import { ExerciseIllustration } from '../illustrations/ExerciseIllustration'
import { Button, Card, cx, Ring, Sheet, Stepper } from '../components/ui'

const KEY = 'homefit.cardioTimer'

interface TimerState {
  startedAt: number
  pausedAt: number | null
  pausedMs: number
  targetMin: number
}

function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TimerState) : null
  } catch {
    return null
  }
}
function saveTimer(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    /* хранилище недоступно */
  }
}

function elapsedOf(t: TimerState | null, now: number) {
  if (!t) return 0
  const end = t.pausedAt ?? now
  return Math.max(0, (end - t.startedAt - t.pausedMs) / 1000)
}

const WARM = 3 * 60
const COOL = 2 * 60

function phaseOf(sec: number, targetSec: number) {
  if (sec < WARM) return { name: 'Разминка', hint: 'Лёгкий темп, дыхание спокойное', idx: 0 }
  if (sec < targetSec - COOL) return { name: 'Основная часть', hint: 'Умеренно: 5–6 из 10, можно говорить фразами', idx: 1 }
  if (sec < targetSec) return { name: 'Заминка', hint: 'Снизь темп, выровняй дыхание', idx: 2 }
  return { name: 'Цель выполнена', hint: 'Можно заканчивать или спокойно дошагать', idx: 3 }
}

export function Cardio() {
  const profile = useStore((s) => s.profile)
  const cardio = useStore((s) => s.cardio)
  const today = todayISO()
  const week = programWeek(profile, today)
  const goal = weekPlan(week).cardioMin
  const last = cardio.length ? cardio[cardio.length - 1] : null

  const [timer, setTimer] = useState<TimerState | null>(loadTimer)
  const [target, setTarget] = useState(timer?.targetMin ?? goal)
  const [now, setNow] = useState(Date.now())
  const [finish, setFinish] = useState(false)
  const lastPhase = useRef<number | null>(null)

  const running = !!timer && timer.pausedAt === null
  useWakeLock(running)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => saveTimer(timer), [timer])

  const sec = elapsedOf(timer, now)
  const targetSec = (timer?.targetMin ?? target) * 60
  const phase = phaseOf(sec, targetSec)

  useEffect(() => {
    if (!running) return
    if (lastPhase.current !== null && lastPhase.current !== phase.idx) signal(phase.idx === 3 ? 'done' : 'phase')
    lastPhase.current = phase.idx
  }, [phase.idx, running])

  const startOrPause = () => {
    unlockAudio()
    const t = Date.now()
    setNow(t)
    if (!timer) {
      lastPhase.current = 0
      setTimer({ startedAt: t, pausedAt: null, pausedMs: 0, targetMin: target })
    } else if (timer.pausedAt === null) {
      setTimer({ ...timer, pausedAt: t })
    } else {
      setTimer({ ...timer, pausedMs: timer.pausedMs + (t - timer.pausedAt), pausedAt: null })
    }
  }

  const stop = () => {
    if (timer && timer.pausedAt === null) setTimer({ ...timer, pausedAt: Date.now() })
    setFinish(true)
  }

  const suggestion = (() => {
    if (!last) return null
    if (last.feeling === 'hard') return `Прошлое занятие (${fmtShort(last.date)}, ${last.minutes} мин) было тяжёлым — сегодня можно повторить ту же длительность.`
    return `Прошлое занятие: ${fmtShort(last.date)}, ${last.minutes} мин.`
  })()

  return (
    <div className="pb-6">
      <header className="safe-top sticky top-0 z-30 -mx-4 flex items-center gap-2 bg-bg/90 px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={() => goBack('home')} aria-label="Назад" className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-soft active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="font-semibold leading-tight">Степпер</p>
          <p className="text-xs text-mute">Неделя {week} · цель {goal} мин</p>
        </div>
      </header>

      <div className="mt-2 space-y-4">
        <Card className="flex flex-col items-center py-6">
          <Ring value={sec / targetSec} size={220} stroke={12} color={phase.idx === 3 ? '#2dd4bf' : '#f0935a'}>
            <div className="text-center">
              <p className="tabular text-5xl font-semibold tracking-tight">{fmtClock(sec)}</p>
              <p className="tabular mt-1 text-sm text-mute">из {fmtClock(targetSec)}</p>
            </div>
          </Ring>
          <p className={cx('mt-5 text-lg font-semibold', phase.idx === 3 ? 'text-accent' : 'text-cardio')}>{timer ? phase.name : 'Готов к старту'}</p>
          <p className="mt-1 text-center text-sm text-soft">{timer ? phase.hint : 'Первые 3 минуты — лёгкая разминка, последние 2 — заминка'}</p>
          <div className="mt-3 flex w-full max-w-xs gap-1">
            {[WARM, targetSec - WARM - COOL, COOL].map((len, i) => (
              <div key={i} className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" style={{ flex: Math.max(len, 30) }}>
                <div
                  className="h-full bg-cardio"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((sec - [0, WARM, targetSec - COOL][i]) / Math.max(len, 1)) * 100))}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {timer?.pausedAt && <p className="mt-3 text-sm font-medium text-warn">Пауза</p>}
        </Card>

        {!timer && (
          <Card>
            <p className="mb-3 text-sm text-soft">Длительность сегодня</p>
            <Stepper value={target} onChange={setTarget} min={10} max={40} suffix="мин" />
            {suggestion && <p className="mt-3 text-sm text-mute">{suggestion}</p>}
            {target !== goal && (
              <button type="button" onClick={() => setTarget(goal)} className="mt-2 text-sm font-medium text-cardio">
                Вернуть цель недели: {goal} мин
              </button>
            )}
          </Card>
        )}

        <div className="flex gap-2">
          <Button size="lg" className="flex-1 bg-cardio text-cardio-ink shadow-none" onClick={startOrPause}>
            {running ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
            {!timer ? 'Старт' : running ? 'Пауза' : 'Продолжить'}
          </Button>
          {timer && (
            <Button size="lg" variant="secondary" onClick={stop}>
              <Square size={17} fill="currentColor" /> Стоп
            </Button>
          )}
        </div>

        <ExerciseIllustration id="stepper" />
        <Card>
          <p className="mb-2 font-semibold">Техника и осанка</p>
          <ul className="space-y-2 text-[15px] text-soft">
            {STEPPER_TECHNIQUE.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cardio">•</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-mute">Боль в коленях или голеностопах, головокружение, давящая боль в груди — остановись.</p>
        </Card>
      </div>

      <CardioLogSheet
        open={finish}
        initialMinutes={Math.max(1, Math.round(sec / 60))}
        target={timer?.targetMin ?? target}
        onClose={() => setFinish(false)}
        onSaved={() => {
          setTimer(null)
          saveTimer(null)
          goBack('home')
        }}
        onDiscard={
          timer
            ? () => {
                setTimer(null)
                saveTimer(null)
                setFinish(false)
              }
            : undefined
        }
      />
    </div>
  )
}

export function CardioLogSheet({
  open,
  onClose,
  initialMinutes,
  target,
  onSaved,
  onDiscard,
}: {
  open: boolean
  onClose: () => void
  initialMinutes?: number
  target?: number
  onSaved?: () => void
  onDiscard?: () => void
}) {
  const [minutes, setMinutes] = useState(20)
  const [date, setDate] = useState(todayISO())
  const [feeling, setFeeling] = useState<Feeling | null>(null)

  useEffect(() => {
    if (!open) return
    const s = getState()
    setMinutes(initialMinutes ?? weekPlan(programWeek(s.profile, todayISO())).cardioMin)
    setDate(todayISO())
    setFeeling(null)
  }, [open, initialMinutes])

  const save = () => {
    const s = getState()
    const week = programWeek(s.profile, date)
    actions.addCardio({ date, week, minutes, targetMin: target ?? weekPlan(week).cardioMin, feeling, finishedAt: Date.now() })
    toast('Кардио записано')
    onClose()
    onSaved?.()
  }

  const opts: { v: Feeling; label: string }[] = [
    { v: 'easy', label: 'Легко' },
    { v: 'ok', label: 'Умеренно' },
    { v: 'hard', label: 'Тяжело' },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Записать кардио"
      footer={
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={save}>
            Сохранить
          </Button>
          {onDiscard && (
            <Button variant="ghost" className="w-full" onClick={onDiscard}>
              Сбросить таймер без записи
            </Button>
          )}
        </div>
      }
    >
      <p className="mb-2 text-sm text-soft">Длительность</p>
      <Stepper value={minutes} onChange={setMinutes} min={1} max={90} suffix="мин" />
      <label className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-line">
        <span className="text-sm text-soft">Дата</span>
        <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent text-right text-[15px] outline-none [color-scheme:dark]" />
      </label>
      <p className="mb-2 mt-4 text-sm text-soft">Как перенёс?</p>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setFeeling(feeling === o.v ? null : o.v)}
            aria-pressed={feeling === o.v}
            className={cx('h-12 rounded-2xl font-semibold ring-1 transition', feeling === o.v ? 'bg-cardio/15 text-ink ring-cardio' : 'bg-white/[0.03] text-soft ring-white/[0.06]')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {feeling === 'hard' && <p className="mt-3 text-sm text-mute">В следующий раз не увеличивай длительность — повтори эту.</p>}
      {feeling && feeling !== 'hard' && <p className="mt-3 text-sm text-mute">Если суставы в порядке и на следующий день нет сильной усталости — можно двигаться к цели следующей недели.</p>}
    </Sheet>
  )
}
