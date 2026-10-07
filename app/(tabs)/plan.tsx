import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useStore, actions } from '@/src/store/store'
import { programWeek } from '@/src/store/selectors'
import { todayISO } from '@/src/lib/date'
import { EXERCISES, STRENGTH_ORDER } from '@/src/data/exercises'
import { StaticIllustration } from '@/src/illustrations/ExerciseIllustration'
import { SCHEDULE, TOTAL_WEEKS, WEEKS, WORKOUTS, repsFor, repsLabel, setsFor } from '@/src/data/program'
import type { WorkoutId } from '@/src/types'
import { Button, Card, Chip, Header, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function PlanScreen() {
  const profile = useStore((s) => s.profile)
  const active = useStore((s) => s.active)
  const current = programWeek(profile, todayISO())
  const [week, setWeek] = useState(current)
  const [open, setOpen] = useState<WorkoutId | null>('A')
  const [showAll, setShowAll] = useState(false)
  const weekInfo = WEEKS[week - 1]
  const start = (id: WorkoutId) => {
    if (active) return Alert.alert('Тренировка уже идёт', 'Сначала заверши или удали текущую.', [{ text: 'Открыть', onPress: () => router.push('/workout') }, { text: 'Отмена' }])
    actions.startWorkout(id, week, todayISO()); router.push('/workout')
  }
  return <Screen>
    <Header title="План" subtitle="8 недель · 3 силовые · 2 кардио · осанка ежедневно" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeks}>{WEEKS.map((item) => <Pressable key={item.n} onPress={() => setWeek(item.n)} style={[styles.week, item.n === week && styles.weekActive, item.n === current && item.n !== week && styles.weekCurrent]}><Text style={[styles.weekSmall, item.n === week && { color: colors.accentInk }]}>НЕД</Text><Text style={[styles.weekNumber, item.n === week && { color: colors.accentInk }]}>{item.n}</Text></Pressable>)}</ScrollView>
    <Card><View style={layout.between}><Text style={[text.body, text.accent]}>Неделя {week} из {TOTAL_WEEKS}</Text><Chip>запас {weekInfo.rir} повт.</Chip></View><Text style={[text.h2, { marginTop: 8 }]}>{weekInfo.phase}: {weekInfo.summary.toLowerCase()}</Text><Text style={[text.soft, { marginTop: 6 }]}>{weekInfo.details}</Text></Card>
    <Section>Расписание</Section>
    <Card>{SCHEDULE.map((day) => <View key={day.weekday} style={styles.schedule}><Text style={styles.day}>{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][day.weekday]}</Text><Ionicons name={day.kind === 'strength' ? 'barbell-outline' : day.kind === 'cardio' ? 'heart-outline' : 'moon-outline'} color={day.kind === 'strength' ? colors.accent : day.kind === 'cardio' ? colors.cardio : colors.mute} size={18} /><Text style={[text.body, { flex: 1 }]}>{day.title}</Text></View>)}</Card>
    <Section>Силовые тренировки</Section>
    {(['A','B','C'] as WorkoutId[]).map((id) => { const workout = WORKOUTS[id]; const expanded = open === id; return <Card key={id}><Pressable onPress={() => setOpen(expanded ? null : id)} style={layout.between}><View style={{ flex: 1 }}><View style={layout.row}><View style={styles.badge}><Text style={styles.badgeText}>{id}</Text></View><View style={{ flex: 1 }}><Text style={text.h2}>{workout.title}</Text><Text style={text.soft}>{workout.focus} · {workout.minutes}</Text></View></View></View><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mute} /></Pressable>{expanded ? <View style={{ marginTop: 14, gap: 10 }}>{workout.items.map((item, index) => <Pressable key={item.exerciseId} onPress={() => router.push({ pathname: '/exercise', params: { id: item.exerciseId, week: String(week) } })} style={styles.exercise}><StaticIllustration id={item.exerciseId} style={styles.thumb} /><View style={{ flex: 1 }}><Text style={text.body}>{EXERCISES[item.exerciseId].name}</Text><Text style={text.muted}>{setsFor(item, index, week)} × {repsLabel(repsFor(item, week))}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mute} /></Pressable>)}<Button title={`Начать тренировку ${id}`} onPress={() => start(id)} /></View> : null}</Card> })}
    <Section>Все упражнения</Section>
    <Button title={showAll ? 'Скрыть каталог' : `Показать каталог · ${STRENGTH_ORDER.length}`} tone="secondary" onPress={() => setShowAll((value) => !value)} icon={<Ionicons name={showAll ? 'chevron-up' : 'grid-outline'} size={18} color={colors.text} />} />
    {showAll ? <View style={styles.grid}>{STRENGTH_ORDER.map((exerciseId) => <Pressable key={exerciseId} onPress={() => router.push({ pathname: '/exercise', params: { id: exerciseId, week: String(week) } })} style={styles.exerciseCard}><StaticIllustration id={exerciseId} /><Text style={styles.exerciseName}>{EXERCISES[exerciseId].short}</Text></Pressable>)}</View> : null}
  </Screen>
}
const styles = StyleSheet.create({ weeks: { gap: 8, paddingVertical: 4 }, week: { width: 54, height: 56, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, weekActive: { backgroundColor: colors.accent, borderColor: colors.accent }, weekCurrent: { borderColor: colors.accent + '88' }, weekSmall: { color: colors.mute, fontSize: 9, fontWeight: '700' }, weekNumber: { color: colors.text, fontSize: 19, fontWeight: '700' }, schedule: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 12 }, day: { width: 26, color: colors.mute, fontWeight: '600' }, badge: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accent + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, badgeText: { color: colors.accent, fontSize: 18, fontWeight: '800' }, exercise: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10 }, thumb: { width: 82, aspectRatio: 4 / 3 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, exerciseCard: { width: '48%', overflow: 'hidden', borderRadius: 18, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, exerciseName: { color: colors.text, fontSize: 14, fontWeight: '700', padding: 11 } })
