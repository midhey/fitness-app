import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { ComplexId } from '@/src/types'
import { actions } from '@/src/store/store'
import { todayISO } from '@/src/lib/date'
import { COMPLEXES } from '@/src/data/posture'
import { MUSCLE_NAMES } from '@/src/data/muscles'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { SequenceTimer, segmentsFor, totalSeconds } from '@/src/native/SequenceTimer'
import { Button, Card, Chip, ProgressBar, Screen, Section, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function PostureSessionScreen() {
  const params = useLocalSearchParams<{ kind?: string; step?: string }>()
  const kind: ComplexId = params.kind === 'back' ? 'back' : 'daily'
  const complex = COMPLEXES[kind]
  const requestedStep = Number(params.step)
  const [step, setStep] = useState(Number.isInteger(requestedStep) ? Math.max(0, Math.min(complex.items.length - 1, requestedStep)) : 0)
  const [done, setDone] = useState(() => complex.items.map(() => false))
  const exercise = complex.items[step]
  const segments = useMemo(() => segmentsFor(exercise), [exercise])
  const doneCount = done.filter(Boolean).length
  const mark = (index: number, value = true) => setDone((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))
  const save = (leave = true) => {
    const completed = done.filter(Boolean).length
    if (!completed) return Alert.alert('Нет выполненных упражнений', 'Пройди или отметь хотя бы одно упражнение.')
    actions.markPosture({ date: todayISO(), completedAt: Date.now(), steps: completed, total: complex.items.length, complex: kind })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (leave) router.replace('/posture')
  }
  const close = () => {
    if (!doneCount) return router.back()
    Alert.alert('Закончить комплекс?', `Выполнено ${doneCount} из ${complex.items.length}.`, [
      { text: 'Остаться' }, { text: 'Выйти без сохранения', style: 'destructive', onPress: () => router.back() }, { text: 'Сохранить', onPress: () => save() },
    ])
  }
  return <Screen>
    <View style={styles.header}><Pressable onPress={close} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.soft} /></Pressable><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{complex.title}</Text><Text style={text.muted}>Шаг {step + 1} из {complex.items.length} · выполнено {doneCount}</Text></View></View>
    <View style={styles.steps}>{complex.items.map((item, index) => <Pressable key={item.id} onPress={() => setStep(index)} accessibilityLabel={`${item.num}. ${item.name}`} style={[styles.step, index === step && styles.stepCurrent, done[index] && index !== step && styles.stepDone]} />)}</View>
    <View><Text style={styles.exerciseNumber}>Упражнение {exercise.num}</Text><Text style={styles.name}>{exercise.name}</Text></View>
    <ExerciseIllustration id={exercise.illustration} />
    <View style={styles.chips}><Chip tone="posture">{exercise.dose}</Chip><Chip>{Math.ceil(totalSeconds(segments) / 60)} мин по таймеру</Chip></View>
    <SequenceTimer key={exercise.id} segments={segments} onDone={() => mark(step)} />
    <View style={styles.chips}>{exercise.primary.map((muscle) => <Chip key={muscle} tone="accent">{MUSCLE_NAMES[muscle]}</Chip>)}</View>
    <Text style={text.soft}>{exercise.effect}</Text>
    <Section>Как выполнять</Section>
    <Card>{exercise.steps.map((item, index) => <View key={index} style={styles.instruction}><View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View><Text style={[text.body, { flex: 1, lineHeight: 22 }]}>{item}</Text></View>)}</Card>
    {exercise.tips?.map((tip, index) => <View key={index} style={styles.tip}><Ionicons name="information-circle-outline" size={20} color={colors.warn} /><Text style={[text.soft, { color: colors.warn, flex: 1 }]}>{tip}</Text></View>)}
    {exercise.mistakes.length ? <><Section>Типичные ошибки</Section><Card>{exercise.mistakes.map((item, index) => <View key={index} style={styles.instruction}><Ionicons name="close-circle-outline" size={20} color={colors.danger} /><Text style={[text.soft, { flex: 1 }]}>{item}</Text></View>)}</Card></> : null}
    <Pressable onPress={() => mark(step, !done[step])} style={[styles.manual, done[step] && styles.manualDone]}><Ionicons name="checkmark" size={19} color={done[step] ? colors.posture : colors.soft} /><Text style={[styles.manualText, done[step] && { color: colors.posture }]}>{done[step] ? 'Выполнено' : 'Отметить выполненным без таймера'}</Text></Pressable>
    <View style={styles.controls}><Button title="Назад" tone="secondary" disabled={step === 0} onPress={() => setStep(step - 1)} icon={<Ionicons name="chevron-back" size={18} color={colors.text} />} />{step === complex.items.length - 1 ? <Button title="Завершить комплекс" onPress={() => save()} /> : <Button title="Следующее" tone={done[step] ? 'accent' : 'secondary'} onPress={() => setStep(step + 1)} icon={<Ionicons name="chevron-forward" size={18} color={done[step] ? colors.accentInk : colors.text} />} />}</View>
    <ProgressBar value={doneCount / complex.items.length} color={colors.posture} />
    <Text style={[text.muted, { textAlign: 'center' }]}>При боли, онемении или покалывании — прекрати упражнение.</Text>
  </Screen>
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' }, steps: { flexDirection: 'row', gap: 4 }, step: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line }, stepCurrent: { backgroundColor: colors.text }, stepDone: { backgroundColor: colors.posture }, exerciseNumber: { color: colors.posture, fontSize: 14, fontWeight: '700' }, name: { color: colors.text, fontSize: 25, lineHeight: 30, fontWeight: '800', marginTop: 2 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, instruction: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 7 }, number: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.posture + '20', alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.posture, fontSize: 12, fontWeight: '800' }, tip: { flexDirection: 'row', gap: 9, borderRadius: 17, padding: 14, backgroundColor: colors.warn + '12', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.warn + '35' }, manual: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, manualDone: { backgroundColor: colors.posture + '12', borderColor: colors.posture + '45' }, manualText: { color: colors.soft, fontSize: 15, fontWeight: '700' }, controls: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
})
