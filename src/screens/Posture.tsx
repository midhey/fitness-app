import { useState } from 'react'
import { AlertTriangle, Check, ChevronRight, Play } from 'lucide-react'
import type { ComplexId, PostureExercise } from '../types'
import { actions, useStore } from '../store/store'
import { isComplex, postureStreak, postureThisWeek } from '../store/selectors'
import { addDays, mondayOf, parseISO, plural, todayISO, WEEKDAYS_SHORT } from '../lib/date'
import { toast } from '../lib/toast'
import { BACK_COMPLEX, BACK_PER_WEEK, BACK_TOTAL_MIN, POSTURE, POSTURE_MAP, POSTURE_PRINCIPLES, POSTURE_TOTAL_MIN, POSTURE_WARNING } from '../data/posture'
import { StaticIllustration } from '../illustrations/ExerciseIllustration'
import { PostureSheet } from '../components/ExerciseInfo'
import { Button, Card, Confirm, cx, SectionTitle } from '../components/ui'
import { openComplex } from './PostureSession'

export function PostureWarning() {
  return (
    <Card className="bg-warn/[0.07] ring-warn/20">
      <div className="flex items-center gap-2 text-warn">
        <AlertTriangle size={18} />
        <p className="font-semibold">{POSTURE_WARNING.title}</p>
      </div>
      <p className="mt-2 text-[15px] leading-snug text-soft">{POSTURE_WARNING.text}</p>
      <ul className="mt-2 space-y-1.5 text-[15px] leading-snug text-soft">
        {POSTURE_WARNING.items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="text-warn">•</span>
            {x}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-medium text-ink/90">{POSTURE_WARNING.footer}</p>
    </Card>
  )
}

function ExerciseList({ items, onOpen }: { items: PostureExercise[]; onOpen: (ex: PostureExercise) => void }) {
  return (
    <div className="space-y-2">
      {items.map((ex) => (
        <Card key={ex.id} onClick={() => onOpen(ex)} className="p-2 pr-3">
          <div className="flex items-center gap-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-2xl">
              <StaticIllustration id={ex.illustration} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-tight">
                <span className="text-posture">{ex.num}.</span> {ex.name}
              </p>
              <p className="mt-0.5 text-sm text-mute">{ex.dose}</p>
            </div>
            <ChevronRight size={18} className="text-mute" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function Posture() {
  const posture = useStore((s) => s.posture)
  const programStart = useStore((s) => s.profile.programStart)
  const today = todayISO()
  const daily = posture.filter((p) => isComplex(p, 'daily'))
  const done = daily.find((p) => p.date === today)
  const backDone = posture.find((p) => p.date === today && isComplex(p, 'back'))
  const streak = postureStreak(posture, today)
  const week = postureThisWeek(posture, today)
  const backWeek = postureThisWeek(posture, today, 'back')
  const [info, setInfo] = useState<PostureExercise | null>(null)
  const [unmark, setUnmark] = useState<ComplexId | null>(null)

  const gridStart = addDays(mondayOf(today), -21)
  const days = Array.from({ length: 28 }, (_, i) => addDays(gridStart, i))
  const doneSet = new Set(daily.map((p) => p.date))
  // Регулярность считаем с начала программы (или с первой отметки, если она раньше)
  const firstLog = daily.reduce((m, p) => (p.date < m ? p.date : m), programStart)
  const tracked = (d: string) => d >= firstLog && d <= today
  const last28 = days.filter((d) => tracked(d) && doneSet.has(d)).length
  const elapsed = days.filter(tracked).length

  const mark = (complex: ComplexId, total: number) => {
    actions.markPosture({ date: today, completedAt: Date.now(), steps: total, total, complex })
    toast('Комплекс отмечен')
  }

  return (
    <div>
      <header className="pt-2">
        <h1 className="text-[26px] font-semibold tracking-tight">Осанка</h1>
        <p className="mt-0.5 text-sm text-mute">Ежедневный комплекс + «Спина и таз» 3–4 раза в неделю</p>
      </header>

      {/* Ежедневный комплекс */}
      <Card className="mt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-semibold">Ежедневный комплекс</p>
          <p className="text-sm text-mute">~{POSTURE_TOTAL_MIN} мин · 7 упражнений</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-semibold">{streak}</p>
            <p className="text-xs text-mute">{plural(streak, 'день', 'дня', 'дней')} подряд</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{week}/7</p>
            <p className="text-xs text-mute">на этой неделе</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {last28}/{elapsed}
            </p>
            <p className="text-xs text-mute">{elapsed < 28 ? 'с начала программы' : 'за 4 недели'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="text-center text-[10px] font-medium text-mute">
              {d}
            </span>
          ))}
          {days.map((d) => {
            const has = doneSet.has(d)
            const future = !tracked(d)
            return (
              <span
                key={d}
                title={d}
                className={cx(
                  'tabular grid aspect-square place-items-center rounded-lg text-[11px] font-medium',
                  has ? 'bg-posture text-posture-ink' : future ? 'bg-white/[0.02] text-mute/40' : 'bg-white/[0.05] text-mute',
                  d === today && !has && 'ring-1 ring-posture/60',
                )}
              >
                {parseISO(d).getDate()}
              </span>
            )
          })}
        </div>
        <div className="mt-4 space-y-2">
          {done ? (
            <>
              <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-posture/12 font-semibold text-posture">
                <Check size={18} strokeWidth={3} /> Сегодня выполнено
                {done.steps < done.total && ` (${done.steps} из ${done.total})`}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openComplex('daily')}>
                  Пройти ещё раз
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setUnmark('daily')}>
                  Снять отметку
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button size="lg" className="w-full bg-posture text-posture-ink shadow-none" onClick={() => openComplex('daily')}>
                <Play size={18} fill="currentColor" /> Начать комплекс
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => mark('daily', POSTURE.length)}>
                Уже сделал без телефона — отметить
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Спина и таз */}
      <Card className="mt-3">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Спина и таз</p>
          <p className="text-sm text-mute">~{BACK_TOTAL_MIN} мин · 6 упражнений</p>
        </div>
        <p className="mt-1 text-sm leading-snug text-soft">
          Разгибание грудного отдела, контроль таза и поясницы, сгибатели бедра и шея. 3–4 раза в неделю, лучше в дни без силовой — после ежедневного комплекса или вечером.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {Array.from({ length: BACK_PER_WEEK + 1 }, (_, i) => (
            <span
              key={i}
              className={cx('h-2 flex-1 rounded-full', i < backWeek ? 'bg-posture' : i < BACK_PER_WEEK ? 'bg-white/[0.08]' : 'bg-white/[0.04]')}
            />
          ))}
          <span className="ml-1 text-sm text-mute">
            {backWeek} из {BACK_PER_WEEK}–{BACK_PER_WEEK + 1} на неделе
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {backDone ? (
            <>
              <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-posture/12 font-semibold text-posture">
                <Check size={18} strokeWidth={3} /> Сегодня выполнено
                {backDone.steps < backDone.total && ` (${backDone.steps} из ${backDone.total})`}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openComplex('back')}>
                  Пройти ещё раз
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setUnmark('back')}>
                  Снять отметку
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => openComplex('back')}>
                <Play size={18} fill="currentColor" /> Начать «Спина и таз»
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => mark('back', BACK_COMPLEX.length)}>
                Уже сделал без телефона — отметить
              </Button>
            </>
          )}
        </div>
      </Card>

      <SectionTitle>Что на что работает</SectionTitle>
      <Card>
        <ul className="space-y-3">
          {POSTURE_MAP.map((m) => (
            <li key={m.area}>
              <p className="text-[15px] font-medium">{m.area}</p>
              <p className="text-sm leading-snug text-soft">{m.items}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-snug text-mute">
          Это не диагноз. Упражнения улучшают подвижность, силу и привычку держать тело — но не меняют форму позвонков. Структурное ли искривление или привычная поза, определяет только очный осмотр.
        </p>
      </Card>

      <SectionTitle>Принципы</SectionTitle>
      <Card>
        <ul className="space-y-2.5 text-[15px] leading-snug text-soft">
          {POSTURE_PRINCIPLES.map((p, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-posture" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-3">
        <PostureWarning />
      </div>

      <SectionTitle>Ежедневный комплекс</SectionTitle>
      <ExerciseList items={POSTURE} onOpen={setInfo} />

      <SectionTitle>Спина и таз</SectionTitle>
      <ExerciseList items={BACK_COMPLEX} onOpen={setInfo} />

      <PostureSheet ex={info} onClose={() => setInfo(null)} />
      <Confirm
        open={unmark !== null}
        onClose={() => setUnmark(null)}
        title="Снять отметку за сегодня?"
        confirmLabel="Снять"
        onConfirm={() => unmark && actions.unmarkPosture(today, unmark)}
      />
    </div>
  )
}
