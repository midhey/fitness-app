import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Info, TrendingUp, X } from 'lucide-react'
import type { Exercise, MuscleId, PostureExercise } from '../types'
import { MUSCLE_NAMES } from '../data/muscles'
import { EXERCISES } from '../data/exercises'
import { ExerciseIllustration } from '../illustrations/ExerciseIllustration'
import { Chip, cx, Sheet } from './ui'

export function MuscleChips({ primary, secondary = [] }: { primary: MuscleId[]; secondary?: MuscleId[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {primary.map((m) => (
        <Chip key={m} tone="accent">
          {MUSCLE_NAMES[m]}
        </Chip>
      ))}
      {secondary.map((m) => (
        <Chip key={m}>{MUSCLE_NAMES[m]}</Chip>
      ))}
    </div>
  )
}

export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink/90">
          <span className="tabular mt-px grid size-6 shrink-0 place-items-center rounded-full bg-accent/12 text-xs font-semibold text-accent-strong">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

export function Mistakes({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((m, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-snug text-soft">
          <X size={16} className="mt-0.5 shrink-0 text-danger/80" />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  )
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-semibold"
      >
        {title}
        <ChevronDown size={18} className={cx('text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export function StrengthExerciseBody({ ex, week, onAlt }: { ex: Exercise; week?: number; onAlt?: (id: string) => void }) {
  const note = week ? ex.weekNotes?.[week] : undefined
  return (
    <div className="space-y-4">
      <ExerciseIllustration id={ex.id} />
      <MuscleChips primary={ex.primary} secondary={ex.secondary} />
      {ex.alt && onAlt && (
        <button
          type="button"
          onClick={() => onAlt(ex.alt!)}
          className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-left text-[15px] ring-1 ring-white/[0.05] active:scale-[0.99]"
        >
          <span>
            <span className="block font-medium">{ex.implement === 'barbell' ? 'Вариант с гантелями' : 'Вариант со штангой'}</span>
            <span className="text-sm text-mute">{EXERCISES[ex.alt].name}</span>
          </span>
          <ChevronRight size={18} className="text-mute" />
        </button>
      )}
      {note && (
        <div className="flex gap-2.5 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent-strong">
          <TrendingUp size={17} className="mt-px shrink-0" />
          <span>
            <b className="font-semibold">Неделя {week}:</b> {note}
          </span>
        </div>
      )}
      <p className="text-[15px] leading-snug text-soft">{ex.setup}</p>
      <Steps steps={ex.steps} />
      {ex.tips?.map((t, i) => (
        <div key={i} className="flex gap-2.5 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-soft">
          <Info size={16} className="mt-0.5 shrink-0 text-mute" />
          <span>{t}</span>
        </div>
      ))}
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
        {ex.startWeight && <p className="mt-3 text-sm text-mute">Ориентир для старта: {ex.startWeight}. Главное — оставить 2–3 повторения в запасе.</p>}
      </Collapsible>
    </div>
  )
}

export function PostureExerciseBody({ ex }: { ex: PostureExercise }) {
  return (
    <div className="space-y-4">
      <ExerciseIllustration id={ex.illustration} />
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="posture">{ex.dose}</Chip>
        <MuscleChips primary={ex.primary} />
      </div>
      <p className="text-sm text-mute">{ex.effect}</p>
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
    </div>
  )
}

export function ExerciseSheet({
  id,
  week,
  onClose,
  onSwitch,
}: {
  id: string | null
  week?: number
  onClose: () => void
  /** Открыть взаимозаменяемый вариант (гантели ↔ штанга) */
  onSwitch?: (id: string) => void
}) {
  const ex = id ? EXERCISES[id] : null
  return (
    <Sheet open={!!ex} onClose={onClose} title={ex?.name}>
      {ex && <StrengthExerciseBody key={ex.id} ex={ex} week={week} onAlt={onSwitch} />}
    </Sheet>
  )
}

export function PostureSheet({ ex, onClose }: { ex: PostureExercise | null; onClose: () => void }) {
  return (
    <Sheet open={!!ex} onClose={onClose} title={ex ? `${ex.num}. ${ex.name}` : ''}>
      {ex && <PostureExerciseBody ex={ex} />}
    </Sheet>
  )
}
