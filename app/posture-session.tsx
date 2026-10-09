import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComplexId } from '@/src/types'
import { actions } from '@/src/store/store'
import { addDays, mondayOf, todayISO } from '@/src/lib/date'
import { complexFor } from '@/src/data/posture'
import { MUSCLE_NAMES } from '@/src/data/muscles'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { SequenceTimer, segmentsFor, totalSeconds } from '@/src/native/SequenceTimer'
import { Bullet, Button, Chip, Collapsible, IconButton, NumberedSteps, Screen, Txt } from '@/src/native/ui'
import { colors, fonts, tint } from '@/src/native/theme'
import { success, tap } from '@/src/native/feedback'

export default function PostureSessionScreen() {
  const params = useLocalSearchParams<{ kind?: string; step?: string; day?: string }>()
  const navigation = useNavigation()
  const kind: ComplexId = params.kind === 'back' ? 'back' : 'daily'
  // Набор фиксируется на момент открытия: «Спина и таз» меняется по дням
  const [complex] = useState(() => {
    // day — набор другого дня недели (0 = Пн); отметка всё равно ставится на сегодня
    const day = Number(params.day)
    const today = todayISO()
    return complexFor(kind, Number.isInteger(day) && day >= 0 && day <= 6 ? addDays(mondayOf(today), day) : today)
  })
  const count = complex.items.length
  const requested = Number(params.step)
  const [step, setStep] = useState(Number.isInteger(requested) ? Math.max(0, Math.min(count - 1, requested)) : 0)
  const [done, setDone] = useState(() => complex.items.map(() => false))
  const exercise = complex.items[step]
  const segments = useMemo(() => segmentsFor(exercise), [exercise])
  const doneCount = done.filter(Boolean).length
  const isLast = step === count - 1

  // Выход системной кнопкой «Назад» не должен молча терять отметки
  const guard = useRef({ doneCount, leaving: false })
  guard.current.doneCount = doneCount
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (guard.current.leaving || guard.current.doneCount === 0) return
        e.preventDefault()
        Alert.alert('Закончить комплекс?', `Выполнено ${guard.current.doneCount} из ${count}.`, [
          { text: 'Остаться', style: 'cancel' },
          {
            text: 'Выйти без сохранения',
            style: 'destructive',
            onPress: () => {
              guard.current.leaving = true
              navigation.dispatch(e.data.action)
            },
          },
          { text: 'Сохранить', onPress: () => save() },
        ])
      }),
    [navigation, count],
  )

  const mark = (index: number, value = true) => setDone((current) => current.map((item, i) => (i === index ? value : item)))
  const go = (index: number) => {
    tap()
    setStep(index)
  }
  function save() {
    const completed = guard.current.doneCount
    if (!completed) return Alert.alert('Нет выполненных упражнений', 'Пройди по таймеру или отметь хотя бы одно упражнение.')
    actions.markPosture({ date: todayISO(), completedAt: Date.now(), steps: completed, total: count, complex: kind })
    success()
    guard.current.leaving = true
    router.back()
  }

  const footer = (
    <View style={styles.nav}>
      <IconButton
        icon="chevron-back"
        label="Предыдущее упражнение"
        size={56}
        background={colors.elevated}
        color={colors.text}
        onPress={() => step > 0 && go(step - 1)}
      />
      {isLast ? (
        <Button title="Завершить комплекс" size="lg" icon="checkmark-done" color={colors.posture} onPress={save} style={{ flex: 1 }} />
      ) : (
        <Button
          title={`Дальше: ${complex.items[step + 1].name}`}
          size="lg"
          iconRight="arrow-forward"
          color={colors.posture}
          tone={done[step] ? 'accent' : 'secondary'}
          onPress={() => go(step + 1)}
          style={{ flex: 1 }}
        />
      )}
    </View>
  )

  return (
    <Screen footer={footer}>
      <View style={styles.header}>
        <IconButton icon="close" label="Закрыть комплекс" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt v="h2">{complex.title}</Txt>
          <Txt v="muted">
            Шаг {step + 1} из {count} · выполнено {doneCount}
          </Txt>
        </View>
      </View>
      <View style={styles.steps}>
        {complex.items.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => go(index)}
            hitSlop={{ top: 10, bottom: 10 }}
            accessibilityLabel={`${item.num}. ${item.name}`}
            style={[styles.step, done[index] && styles.stepDone, index === step && styles.stepCurrent]}
          />
        ))}
      </View>

      <View>
        <Txt v="label" color={colors.posture}>
          Упражнение {exercise.num}
          {exercise.focus ? ` · ${exercise.focus}` : ''}
        </Txt>
        <Txt v="title">{exercise.name}</Txt>
        <View style={styles.chips}>
          <Chip color={colors.posture} icon="repeat">
            {exercise.dose}
          </Chip>
          <Chip icon="timer-outline">{Math.ceil(totalSeconds(segments) / 60)} мин по таймеру</Chip>
        </View>
      </View>
      <ExerciseIllustration id={exercise.illustration} />
      <SequenceTimer key={exercise.id} segments={segments} onDone={() => mark(step)} />
      <Pressable onPress={() => mark(step, !done[step])} style={[styles.manual, done[step] && styles.manualDone]}>
        <Ionicons name={done[step] ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done[step] ? colors.posture : colors.soft} />
        <Text style={[styles.manualText, done[step] && { color: colors.posture }]}>
          {done[step] ? 'Выполнено' : 'Отметить без таймера'}
        </Text>
      </Pressable>

      <Txt v="soft">{exercise.effect}</Txt>
      <View style={styles.chips}>
        {exercise.primary.map((muscle) => (
          <Chip key={muscle} color={colors.accent}>
            {MUSCLE_NAMES[muscle]}
          </Chip>
        ))}
      </View>
      <Collapsible title="Как выполнять">
        <NumberedSteps steps={exercise.steps} color={colors.posture} />
        {exercise.tips?.length ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            {exercise.tips.map((tip, index) => (
              <Bullet key={index} icon="information-circle-outline" color={colors.warn}>
                {tip}
              </Bullet>
            ))}
          </View>
        ) : null}
      </Collapsible>
      {exercise.mistakes.length ? (
        <Collapsible title="Типичные ошибки">
          <View style={{ gap: 10 }}>
            {exercise.mistakes.map((item, index) => (
              <Bullet key={index} icon="close-circle-outline" color={colors.danger}>
                {item}
              </Bullet>
            ))}
          </View>
        </Collapsible>
      ) : null}
      <Txt v="muted" style={{ textAlign: 'center' }}>
        При боли, онемении или покалывании — прекрати упражнение.
      </Txt>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line },
  stepDone: { backgroundColor: colors.posture },
  stepCurrent: { backgroundColor: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  manual: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualDone: { backgroundColor: tint(colors.posture, 0.1), borderColor: tint(colors.posture, 0.4) },
  manualText: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 15 },
  nav: { flexDirection: 'row', gap: 10 },
})
