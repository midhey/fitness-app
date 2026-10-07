import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { EXERCISES } from '@/src/data/exercises'
import { MUSCLE_NAMES } from '@/src/data/muscles'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { Button, Card, Chip, Screen, Section, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ id?: string; week?: string }>()
  const exercise = params.id ? EXERCISES[params.id] : undefined
  const week = Number(params.week)
  if (!exercise) return <Screen><Text style={text.h2}>Упражнение не найдено</Text><Button title="Закрыть" onPress={() => router.back()} /></Screen>
  const note = Number.isFinite(week) ? exercise.weekNotes?.[week] : undefined
  return <Screen>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.title}>{exercise.name}</Text><Text style={text.soft}>{exercise.short}</Text></View><Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={23} color={colors.soft} /></Pressable></View>
    <ExerciseIllustration id={exercise.id} />
    <View style={styles.chips}>{exercise.primary.map((muscle) => <Chip key={muscle} tone="accent">{MUSCLE_NAMES[muscle]}</Chip>)}{exercise.secondary.map((muscle) => <Chip key={muscle}>{MUSCLE_NAMES[muscle]}</Chip>)}</View>
    {exercise.alt ? <Button title={`${exercise.implement === 'barbell' ? 'Вариант с гантелями' : 'Вариант со штангой'}: ${EXERCISES[exercise.alt].short}`} tone="secondary" onPress={() => router.replace({ pathname: '/exercise', params: { id: exercise.alt!, week: params.week } })} /> : null}
    {note ? <View style={styles.note}><Ionicons name="trending-up" size={19} color={colors.accent} /><Text style={[text.soft, { color: colors.accent, flex: 1 }]}><Text style={{ fontWeight: '800' }}>Неделя {week}: </Text>{note}</Text></View> : null}
    <Card><Text style={text.body}>{exercise.setup}</Text>{exercise.startWeight ? <Text style={[text.muted, { marginTop: 10 }]}>Ориентир для старта: {exercise.startWeight}</Text> : null}</Card>
    <Section>Как выполнять</Section><Card>{exercise.steps.map((step, index) => <View key={index} style={styles.row}><View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View><Text style={[text.body, { flex: 1, lineHeight: 22 }]}>{step}</Text></View>)}</Card>
    {exercise.tips?.map((tip, index) => <View key={index} style={styles.tip}><Ionicons name="information-circle-outline" size={20} color={colors.warn} /><Text style={[text.soft, { flex: 1 }]}>{tip}</Text></View>)}
    <Section>Типичные ошибки</Section><Card>{exercise.mistakes.map((mistake, index) => <View key={index} style={styles.row}><Ionicons name="close-circle-outline" size={20} color={colors.danger} /><Text style={[text.soft, { flex: 1 }]}>{mistake}</Text></View>)}</Card>
    <Section>Прогрессия при упоре в вес</Section><Card>{exercise.progression.map((item, index) => <View key={index} style={styles.row}><Text style={styles.arrow}>→</Text><Text style={[text.soft, { flex: 1 }]}>{item}</Text></View>)}</Card>
  </Screen>
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, title: { color: colors.text, fontSize: 27, lineHeight: 32, fontWeight: '800' }, close: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, note: { flexDirection: 'row', gap: 9, padding: 14, borderRadius: 17, backgroundColor: colors.accent + '12' }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 }, number: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent + '16' }, numberText: { color: colors.accent, fontSize: 12, fontWeight: '800' }, tip: { flexDirection: 'row', gap: 9, borderRadius: 17, padding: 14, backgroundColor: colors.warn + '12' }, arrow: { color: colors.accent, fontSize: 18, fontWeight: '800' } })
