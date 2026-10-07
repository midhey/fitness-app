import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { Feeling } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { EXERCISES } from '@/src/data/exercises'
import { repsFor, repsLabel, WARMUP, WORKOUTS } from '@/src/data/program'
import { Button, Card, Chip, Header, ProgressBar, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'
import { signal } from '@/src/native/feedback'

export default function WorkoutScreen() {
  const active = useStore((s) => s.active)
  const [feeling, setFeeling] = useState<Feeling | null>('ok')
  const [note, setNote] = useState('')
  if (!active) return <Screen><Header title="Тренировка" /><Card><Text style={text.soft}>Активной тренировки нет.</Text><View style={{ height: 14 }} /><Button title="Вернуться" onPress={() => router.replace('/')} /></Card></Screen>
  const workout = WORKOUTS[active.workoutId]
  const allSets = active.exercises.flatMap((item) => item.sets)
  const done = allSets.filter((item) => item.done).length
  const toggle = (exerciseIndex: number, setIndex: number) => {
    const wasDone = active.exercises[exerciseIndex].sets[setIndex].done
    const restSec = workout.items[exerciseIndex].restSec
    actions.updateActive((session) => ({ ...session, rest: wasDone ? session.rest : { endsAt: Date.now() + restSec * 1000, total: restSec, label: `После подхода ${setIndex + 1}` }, exercises: session.exercises.map((exercise, ei) => ei !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((setItem, si) => si === setIndex ? { ...setItem, done: !setItem.done } : setItem) }) }))
    Haptics.selectionAsync()
  }
  const value = (exerciseIndex: number, setIndex: number, key: 'weight' | 'reps', next: string) => actions.updateActive((session) => ({ ...session, exercises: session.exercises.map((exercise, ei) => ei !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((setItem, si) => si === setIndex ? { ...setItem, [key]: next } : setItem) }) }))
  const finish = () => {
    if (!done) return Alert.alert('Нет выполненных подходов', 'Отметь хотя бы один подход.')
    Alert.alert('Завершить тренировку?', `Выполнено ${done} из ${allSets.length} подходов.`, [{ text: 'Отмена' }, { text: 'Завершить', onPress: () => { actions.finishWorkout(feeling, note); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.replace('/') } }])
  }
  return <Screen>
    <Header title={workout.title} subtitle={`Неделя ${active.week} · ${workout.focus}`} right={<Pressable onPress={() => Alert.alert('Удалить тренировку?', 'Введённые подходы не сохранятся.', [{ text: 'Отмена' }, { text: 'Удалить', style: 'destructive', onPress: () => { actions.discardWorkout(); router.replace('/') } }])} style={styles.close}><Ionicons name="close" size={24} color={colors.soft} /></Pressable>} />
    {active.rest ? <RestTimer endsAt={active.rest.endsAt} total={active.rest.total} label={active.rest.label} /> : null}
    <Card><View style={layout.between}><Text style={text.body}>Прогресс</Text><Text style={text.accent}>{done}/{allSets.length} подходов</Text></View><View style={{ height: 10 }} /><ProgressBar value={done / allSets.length} /></Card>
    <Card><View style={layout.between}><View><Text style={text.h2}>Разминка</Text><Text style={text.soft}>{active.warmup.filter(Boolean).length} из {WARMUP.length}</Text></View><Chip tone={active.warmup.every(Boolean) ? 'accent' : 'default'}>{active.warmup.every(Boolean) ? 'готово' : 'перед тренировкой'}</Chip></View><View style={{ marginTop: 10 }}>{WARMUP.map((item, index) => <Pressable key={item} onPress={() => actions.updateActive((session) => ({ ...session, warmup: session.warmup.map((value, itemIndex) => itemIndex === index ? !value : value) }))} style={styles.warmup}><Ionicons name={active.warmup[index] ? 'checkbox' : 'square-outline'} size={22} color={active.warmup[index] ? colors.accent : colors.mute} /><Text style={[text.soft, active.warmup[index] && { color: colors.text }]}>{item}</Text></Pressable>)}</View></Card>
    {active.exercises.map((exercise, exerciseIndex) => { const info = EXERCISES[exercise.exerciseId]; const item = workout.items[exerciseIndex]; return <Card key={`${exercise.exerciseId}-${exerciseIndex}`}>
      <View style={layout.between}><View style={{ flex: 1 }}><Text style={text.h2}>{exerciseIndex + 1}. {info.name}</Text><Text style={[text.soft, { marginTop: 3 }]}>{repsLabel(repsFor(item, active.week))} повторений · отдых {item.restSec} сек</Text></View><Chip tone="accent">{info.implement === 'pair' ? 'вес 1 гантели' : info.implement === 'none' ? 'без веса' : 'вес'}</Chip></View>
      {info.alt ? <Button title={info.implement === 'barbell' ? 'Перейти на гантели' : 'Перейти на штангу'} compact tone="ghost" disabled={exercise.sets.some((setItem) => setItem.done)} onPress={() => actions.swapExercise(exerciseIndex, info.alt!)} /> : null}
      <Pressable onPress={() => router.push({ pathname: '/exercise', params: { id: info.id, week: String(active.week) } })} style={styles.technique}><View style={styles.techniqueIcon}><Ionicons name="body-outline" size={23} color={colors.accent} /></View><View style={{ flex: 1 }}><Text style={styles.techniqueTitle}>Анимация и техника</Text><Text style={text.muted}>Положение, траектория, мышцы и ошибки</Text></View><Ionicons name="chevron-forward" size={20} color={colors.mute} /></Pressable>
      <View style={styles.labels}><Text style={[styles.label, { width: 34 }]}>№</Text><Text style={styles.label}>Вес, кг</Text><Text style={styles.label}>Повторы</Text><Text style={[styles.label, { width: 44 }]}>Готово</Text></View>
      {exercise.sets.map((setItem, setIndex) => <View key={setIndex} style={styles.setRow}><Text style={styles.setNumber}>{setIndex + 1}</Text><TextInput value={setItem.weight} onChangeText={(next) => value(exerciseIndex, setIndex, 'weight', next)} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.mute} editable={info.tracking !== 'bodyweight'} style={[styles.input, info.tracking === 'bodyweight' && { opacity: .35 }]} /><TextInput value={setItem.reps} onChangeText={(next) => value(exerciseIndex, setIndex, 'reps', next)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.mute} style={styles.input} /><Pressable onPress={() => toggle(exerciseIndex, setIndex)} style={[styles.check, setItem.done && styles.checked]}><Ionicons name="checkmark" size={20} color={setItem.done ? colors.accentInk : colors.mute} /></Pressable></View>)}
      <Text style={[text.muted, { marginTop: 10 }]}>{info.startWeight ?? info.setup}</Text>
    </Card> })}
    <Section>Как прошло?</Section>
    <View style={styles.feelings}>{([['easy','Легко'],['ok','Нормально'],['hard','Тяжело']] as [Feeling,string][]).map(([value, label]) => <Pressable key={value} onPress={() => setFeeling(value)} style={[styles.feeling, feeling === value && styles.feelingOn]}><Text style={[styles.feelingText, feeling === value && { color: colors.accentInk }]}>{label}</Text></Pressable>)}</View>
    <TextInput value={note} onChangeText={setNote} placeholder="Заметка о тренировке" placeholderTextColor={colors.mute} multiline style={styles.note} />
    <Button title="Завершить тренировку" onPress={finish} />
  </Screen>
}
function RestTimer({ endsAt, total, label }: { endsAt: number; total: number; label: string }) {
  const [now, setNow] = useState(Date.now())
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  useEffect(() => { if (left > 0) return; actions.updateActive((session) => ({ ...session, rest: null })); signal('done') }, [left])
  return <Card style={styles.rest}><View style={{ flex: 1 }}><Text style={styles.restTime}>{left} сек</Text><Text style={text.soft}>{label}</Text><View style={{ height: 7 }} /><ProgressBar value={1 - left / total} /></View><Pressable onPress={() => actions.updateActive((session) => ({ ...session, rest: null }))} style={styles.skip}><Ionicons name="play-skip-forward" size={20} color={colors.accentInk} /></Pressable></Card>
}
const styles = StyleSheet.create({ close: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }, rest: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accent + '12', borderColor: colors.accent + '40' }, restTime: { color: colors.accent, fontSize: 25, fontWeight: '800', fontVariant: ['tabular-nums'] }, skip: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, warmup: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 }, technique: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, padding: 8, borderRadius: 16, backgroundColor: colors.elevated }, techniqueIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent + '12' }, techniqueTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, labels: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 15, marginBottom: 6 }, label: { flex: 1, color: colors.mute, fontSize: 11, textAlign: 'center' }, setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }, setNumber: { width: 34, color: colors.soft, textAlign: 'center', fontWeight: '700' }, input: { flex: 1, height: 46, borderRadius: 13, backgroundColor: colors.elevated, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '600', borderWidth: 1, borderColor: colors.line }, check: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, checked: { backgroundColor: colors.accent, borderColor: colors.accent }, feelings: { flexDirection: 'row', padding: 4, borderRadius: 17, backgroundColor: colors.card }, feeling: { flex: 1, minHeight: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, feelingOn: { backgroundColor: colors.accent }, feelingText: { color: colors.soft, fontWeight: '700' }, note: { minHeight: 86, borderRadius: 16, padding: 14, textAlignVertical: 'top', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: 15 } })
