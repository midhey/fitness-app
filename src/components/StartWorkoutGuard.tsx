import { useEffect, useState } from 'react'
import type { WorkoutId } from '../types'
import { actions, getState } from '../store/store'
import { programWeek } from '../store/selectors'
import { addDays } from '../lib/date'
import { navigate } from '../lib/router'
import { WORKOUTS } from '../data/program'
import { Button, Sheet } from './ui'

type Issue = { kind: 'active'; title: string } | { kind: 'recent'; text: string }

/**
 * Запуск силовой с проверками: незавершённая тренировка и силовая накануне
 * (между силовыми нужно ~48 часов).
 */
export function StartWorkoutGuard({ request, onClose }: { request: { id: WorkoutId; date: string } | null; onClose: () => void }) {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [skipRecent, setSkipRecent] = useState(false)

  const start = (id: WorkoutId, date: string) => {
    const s = getState()
    actions.startWorkout(id, programWeek(s.profile, date), date)
    onClose()
    navigate('workout')
  }

  useEffect(() => {
    if (!request) {
      setIssue(null)
      setSkipRecent(false)
      return
    }
    const s = getState()
    if (s.active) {
      setIssue({ kind: 'active', title: WORKOUTS[s.active.workoutId].title })
      return
    }
    const near = s.workouts.find((w) => w.date === request.date || w.date === addDays(request.date, -1))
    if (near && !skipRecent) {
      setIssue({
        kind: 'recent',
        text:
          near.date === request.date
            ? 'Сегодня уже была силовая тренировка. Вторая за день не ускорит прогресс, а восстановление замедлит.'
            : 'Вчера была силовая. Мышцам нужно около 48 часов на восстановление — лучше сегодня кардио, осанка или отдых.',
      })
      return
    }
    start(request.id, request.date)
  }, [request, skipRecent])

  if (!request || !issue) return null

  if (issue.kind === 'active') {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Есть незавершённая тренировка"
        footer={
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                onClose()
                navigate('workout')
              }}
            >
              Продолжить: {issue.title}
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                actions.discardWorkout()
                setIssue(null)
                setSkipRecent(false)
                const s = getState()
                const near = s.workouts.find((w) => w.date === request.date || w.date === addDays(request.date, -1))
                if (near) setIssue({ kind: 'recent', text: 'Недавно уже была силовая. Мышцам нужно около 48 часов на восстановление.' })
                else start(request.id, request.date)
              }}
            >
              Удалить её и начать {WORKOUTS[request.id].title}
            </Button>
          </div>
        }
      >
        <p className="text-[15px] text-soft">«{issue.title}» начата, но не завершена. Одновременно может идти только одна тренировка.</p>
      </Sheet>
    )
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Нужен день восстановления"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Отложить
          </Button>
          <Button className="flex-1" onClick={() => setSkipRecent(true)}>
            Всё равно начать
          </Button>
        </div>
      }
    >
      <p className="text-[15px] leading-relaxed text-soft">{issue.text}</p>
    </Sheet>
  )
}
