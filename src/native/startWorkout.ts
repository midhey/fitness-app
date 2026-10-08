import { Alert } from 'react-native'
import { router } from 'expo-router'
import type { WorkoutId } from '../types'
import { WORKOUTS } from '../data/program'
import { actions, getState } from '../store/store'

/** Открыть тренировку: продолжить текущую или начать новую, не теряя незавершённую молча */
export function openWorkout(id: WorkoutId, week: number, date: string) {
  const { active } = getState()
  if (active?.workoutId === id) return router.push('/workout')
  const begin = () => {
    actions.startWorkout(id, week, date)
    router.push('/workout')
  }
  if (!active) return begin()
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  Alert.alert(
    `${WORKOUTS[active.workoutId].title} не завершена`,
    done ? `Отмечено подходов: ${done}. Если начать новую, они не сохранятся.` : 'Продолжить её или начать новую?',
    [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Начать новую', style: 'destructive', onPress: begin },
      { text: 'Продолжить', onPress: () => router.push('/workout') },
    ],
  )
}
