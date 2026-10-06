import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import type { ComplexId } from '../types'
import { actions } from '../store/store'
import { todayISO } from '../lib/date'
import { goBack, navigate } from '../lib/router'
import { toast } from '../lib/toast'
import { COMPLEXES } from '../data/posture'
import { ExerciseIllustration } from '../illustrations/ExerciseIllustration'
import { Collapsible, Mistakes, MuscleChips, Steps } from '../components/ExerciseInfo'
import { SequenceTimer, segmentsFor } from '../components/SequenceTimer'
import { Button, Chip, cx, ProgressBar } from '../components/ui'

const KEY = 'homefit.complex'

/** Открыть пошаговый режим нужного комплекса (выбор переживает перезагрузку вкладки) */
export function openComplex(id: ComplexId) {
  try {
    sessionStorage.setItem(KEY, id)
  } catch {
    /* хранилище недоступно — откроется ежедневный комплекс */
  }
  navigate('posture-session')
}

function currentComplex(): ComplexId {
  try {
    return sessionStorage.getItem(KEY) === 'back' ? 'back' : 'daily'
  } catch {
    return 'daily'
  }
}

export function PostureSession() {
  const [complexId] = useState<ComplexId>(currentComplex)
  const complex = COMPLEXES[complexId]
  const items = complex.items
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false))
  const ex = items[step]
  const segments = useMemo(() => segmentsFor(ex), [ex])
  const doneCount = done.filter(Boolean).length
  const isLast = step === items.length - 1

  const markDone = (i: number, v = true) => setDone((d) => d.map((x, k) => (k === i ? v : x)))
  const go = (i: number) => {
    setStep(i)
    window.scrollTo({ top: 0 })
  }

  const finish = () => {
    const steps = done.filter(Boolean).length
    if (steps === 0) {
      toast('Отметь хотя бы одно выполненное упражнение')
      return
    }
    actions.markPosture({ date: todayISO(), completedAt: Date.now(), steps, total: items.length, complex: complexId })
    toast(steps === items.length ? 'Комплекс выполнен' : `Отмечено: ${steps} из ${items.length}`)
    goBack('posture')
  }

  return (
    <div className="pb-6">
      <header className="safe-top sticky top-0 z-30 -mx-4 bg-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => goBack('posture')} aria-label="Выйти из комплекса" className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-soft active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="font-semibold leading-tight">{complex.title}</p>
            <p className="text-xs text-mute">
              Шаг {step + 1} из {items.length} · выполнено {doneCount}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`${p.num}. ${p.name}`}
              className={cx('h-1.5 flex-1 rounded-full transition', i === step ? 'bg-ink' : done[i] ? 'bg-posture' : 'bg-white/10')}
            />
          ))}
        </div>
      </header>

      <div className="mt-3 space-y-4">
        <div>
          <p className="text-sm font-medium text-posture">Упражнение {ex.num}</p>
          <h2 className="mt-0.5 text-[22px] font-semibold leading-tight">{ex.name}</h2>
        </div>

        <ExerciseIllustration id={ex.illustration} />

        <div className="flex flex-wrap gap-1.5">
          <Chip tone="posture">{ex.dose}</Chip>
        </div>

        <SequenceTimer key={ex.id} segments={segments} onDone={() => markDone(step)} />

        <MuscleChips primary={ex.primary} />
        <p className="-mt-2 text-sm text-mute">{ex.effect}</p>

        <Steps steps={ex.steps} />
        {ex.tips?.map((t, i) => (
          <div key={i} className="flex gap-2.5 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>{t}</span>
          </div>
        ))}
        <Collapsible title="Типичные ошибки">
          <Mistakes items={ex.mistakes} />
        </Collapsible>

        <button
          type="button"
          onClick={() => markDone(step, !done[step])}
          aria-pressed={done[step]}
          className={cx('flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium ring-1 transition', done[step] ? 'bg-posture/12 text-posture ring-posture/30' : 'text-soft ring-line')}
        >
          <Check size={17} strokeWidth={3} /> {done[step] ? 'Выполнено' : 'Отметить выполненным без таймера'}
        </button>

        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="px-4" disabled={step === 0} onClick={() => go(step - 1)} aria-label="Предыдущее упражнение">
            <ChevronLeft size={20} />
          </Button>
          {isLast ? (
            <Button size="lg" className="flex-1 bg-posture text-posture-ink shadow-none" onClick={finish}>
              Завершить комплекс
            </Button>
          ) : (
            <Button
              size="lg"
              variant={done[step] ? 'primary' : 'secondary'}
              className={cx('flex-1', done[step] && 'bg-posture text-posture-ink shadow-none')}
              onClick={() => go(step + 1)}
            >
              Следующее <ChevronRight size={18} />
            </Button>
          )}
        </div>
        <div>
          <ProgressBar value={doneCount / items.length} tone="posture" />
          <p className="mt-1.5 text-center text-xs text-mute">При боли, онемении или покалывании — прекрати упражнение.</p>
        </div>
      </div>
    </div>
  )
}
