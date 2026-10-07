import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import type { WorkoutId } from '@/src/types'
import { useStore, actions } from '@/src/store/store'
import { dayStatus, latestWeight, postureStreak, programWeek, rawWeek, weeklyPace } from '@/src/store/selectors'
import { fmtLong, todayISO, weekdayIdx } from '@/src/lib/date'
import { SCHEDULE, TOTAL_WEEKS, weekPlan, WORKOUTS } from '@/src/data/program'
import { Button, Card, Chip, Header, ProgressBar, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

const kg = (value: number) => value.toFixed(1).replace('.', ',')
export default function HomeScreen() {
  const state = useStore((s) => s)
  const today = todayISO()
  const week = programWeek(state.profile, today)
  const raw = rawWeek(state.profile, today)
  const plan = weekPlan(week)
  const current = latestWeight(state.weights)?.kg ?? state.profile.startWeight
  const remaining = Math.max(0, current - state.profile.goalWeight)
  const progress = (state.profile.startWeight - current) / Math.max(1, state.profile.startWeight - state.profile.goalWeight)
  const pace = weeklyPace(state.weights, today)
  const status = dayStatus(state, today)
  const todayPlan = SCHEDULE[weekdayIdx(today)]
  const streak = postureStreak(state.posture, today)

  const start = (id: WorkoutId) => {
    if (state.active && state.active.workoutId !== id) {
      Alert.alert('Есть незавершённая тренировка', 'Продолжить её или начать новую?', [
        { text: 'Продолжить', onPress: () => router.push('/workout') },
        { text: 'Начать новую', style: 'destructive', onPress: () => { actions.startWorkout(id, week, today); router.push('/workout') } },
      ])
      return
    }
    if (!state.active) actions.startWorkout(id, week, today)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/workout')
  }

  return <Screen>
    <Header title={fmtLong(today)} subtitle={raw > TOTAL_WEEKS ? 'Программа завершена' : `Неделя ${week} из ${TOTAL_WEEKS} · ${plan.phase}`} right={<Pressable onPress={() => router.push('/profile')} style={styles.round}><Ionicons name="settings-outline" size={21} color={colors.soft} /></Pressable>} />
    {state.active ? <Pressable onPress={() => router.push('/workout')}><Card style={styles.active}><View style={layout.between}><View><Text style={text.h2}>{WORKOUTS[state.active.workoutId].title}</Text><Text style={text.soft}>Незавершённая тренировка · продолжить</Text></View><Ionicons name="chevron-forward" size={22} color={colors.accent} /></View></Card></Pressable> : null}
    <Card>
      <View style={layout.between}><View><Text style={text.muted}>Текущий вес</Text><Text style={text.big}>{kg(current)}<Text style={styles.unit}> кг</Text></Text></View><View style={{ alignItems: 'flex-end' }}><Text style={text.muted}>Цель</Text><Text style={[text.h2, text.accent]}>{kg(state.profile.goalWeight)} кг</Text></View></View>
      <View style={{ height: 14 }} /><ProgressBar value={progress} />
      <View style={[layout.between, { marginTop: 9 }]}><Text style={text.soft}>{kg(state.profile.startWeight - current)} кг с начала</Text><Text style={text.muted}>{remaining ? `осталось ${kg(remaining)} кг` : 'цель достигнута'}</Text></View>
      <Text style={[text.muted, { marginTop: 10 }]}>Темп: {pace == null ? 'появится после нескольких взвешиваний' : `${pace > 0 ? '+' : ''}${kg(pace)} кг/нед`}</Text>
      <View style={{ height: 14 }} /><Button title="Записать вес" tone="secondary" onPress={() => router.push('/weight')} icon={<Ionicons name="add" size={19} color={colors.text} />} />
    </Card>
    <Section>Сегодня</Section>
    {todayPlan.kind === 'strength' && todayPlan.workoutId ? <Card><View style={layout.between}><View style={{ flex: 1 }}><Chip tone="accent">Силовая {todayPlan.workoutId}</Chip><Text style={[text.h2, { marginTop: 9 }]}>{WORKOUTS[todayPlan.workoutId].title}</Text><Text style={text.soft}>{WORKOUTS[todayPlan.workoutId].focus} · {WORKOUTS[todayPlan.workoutId].minutes}</Text></View></View><View style={{ height: 14 }} />{status.strength.some((log) => log.workoutId === todayPlan.workoutId) ? <View style={styles.done}><Ionicons name="checkmark-circle" size={20} color={colors.accent} /><Text style={[text.body, text.accent]}>Выполнено</Text></View> : <Button title="Начать тренировку" onPress={() => start(todayPlan.workoutId!)} />}</Card> : <Card><View style={layout.row}><Ionicons name={todayPlan.kind === 'cardio' ? 'heart-outline' : 'moon-outline'} size={28} color={todayPlan.kind === 'cardio' ? colors.cardio : colors.soft} /><View style={{ marginLeft: 12, flex: 1 }}><Text style={text.h2}>{todayPlan.title}</Text><Text style={text.soft}>{todayPlan.note}</Text></View></View>{todayPlan.kind === 'cardio' ? <View style={{ marginTop: 14 }}><Button title="Открыть кардио" tone="secondary" onPress={() => router.push('/cardio')} /></View> : null}</Card>}
    <Section>Комплексы</Section>
    <Pressable onPress={() => router.push({ pathname: '/posture-session', params: { kind: 'daily' } })}><Card><View style={layout.between}><View style={[layout.row, { flex: 1 }]}><View style={[styles.icon, { backgroundColor: colors.posture + '18' }]}><Ionicons name="body-outline" size={24} color={colors.posture} /></View><View style={{ flex: 1 }}><Text style={text.h2}>Осанка · 10 мин</Text><Text style={text.soft}>{status.posture ? 'Сегодня выполнено' : 'Ежедневный комплекс'}{streak ? ` · серия ${streak}` : ''}</Text></View></View><Ionicons name={status.posture ? 'checkmark-circle' : 'play-circle'} size={25} color={colors.posture} /></View></Card></Pressable>
    <View style={styles.quick}><Button title="Кардио" tone="secondary" onPress={() => router.push('/cardio')} /><Button title="Весь план" tone="secondary" onPress={() => router.push('/plan')} /></View>
  </Screen>
}
const styles = StyleSheet.create({ round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }, unit: { fontSize: 16, color: colors.mute }, active: { borderColor: colors.accent + '55', backgroundColor: colors.accent + '10' }, done: { minHeight: 48, borderRadius: 15, backgroundColor: colors.accent + '10', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, quick: { flexDirection: 'row', gap: 10 }, })
