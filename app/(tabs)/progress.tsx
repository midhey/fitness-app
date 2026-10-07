import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { actions, useStore } from '@/src/store/store'
import { doneSets, latestWeight, sortByDateDesc, volumeOf } from '@/src/store/selectors'
import { fmtLong, fmtMinutes, fmtShort } from '@/src/lib/date'
import { WORKOUTS } from '@/src/data/program'
import { EXERCISES, STRENGTH_ORDER } from '@/src/data/exercises'
import { LineChart } from '@/src/native/LineChart'
import { Button, Card, Header, Metric, ProgressBar, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'
import type { AppState } from '@/src/types'

type Tab = 'weight' | 'log' | 'lifts'
const kg = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',')
export default function ProgressScreen() {
  const state = useStore((s) => s)
  const [tab, setTab] = useState<Tab>('weight')
  const current = latestWeight(state.weights)?.kg ?? state.profile.startWeight
  const sorted = useMemo(() => [...state.weights].sort((a, b) => b.date.localeCompare(a.date)), [state.weights])
  const logs = useMemo(() => sortByDateDesc([...state.workouts.map((log) => ({ type: 'workout' as const, date: log.date, log })), ...state.cardio.map((log) => ({ type: 'cardio' as const, date: log.date, log }))]), [state.workouts, state.cardio])
  return <Screen>
    <Header title="Прогресс" right={<Button title="+ Вес" compact onPress={() => router.push('/weight')} />} />
    <View style={styles.tabs}><Pressable onPress={() => setTab('weight')} style={[styles.tab, tab === 'weight' && styles.tabOn]}><Text style={[styles.tabText, tab === 'weight' && styles.tabTextOn]}>Вес</Text></Pressable><Pressable onPress={() => setTab('log')} style={[styles.tab, tab === 'log' && styles.tabOn]}><Text style={[styles.tabText, tab === 'log' && styles.tabTextOn]}>Занятия</Text></Pressable><Pressable onPress={() => setTab('lifts')} style={[styles.tab, tab === 'lifts' && styles.tabOn]}><Text style={[styles.tabText, tab === 'lifts' && styles.tabTextOn]}>Рабочие</Text></Pressable></View>
    {tab === 'weight' ? <>
      <View style={styles.metricRow}><Metric label="Сейчас" value={kg(current)} unit="кг" /><Metric label="С начала" value={`${current <= state.profile.startWeight ? '−' : '+'}${kg(Math.abs(current - state.profile.startWeight))}`} unit="кг" /><Metric label="До цели" value={kg(Math.max(0, current - state.profile.goalWeight))} unit="кг" /></View>
      <Card><View style={layout.between}><Text style={text.h2}>Путь к цели</Text><Text style={text.accent}>{kg(state.profile.goalWeight)} кг</Text></View><View style={{ height: 14 }} /><ProgressBar value={(state.profile.startWeight - current) / Math.max(1, state.profile.startWeight - state.profile.goalWeight)} /><Text style={[text.muted, { marginTop: 9 }]}>Старт программы: {kg(state.profile.startWeight)} кг</Text></Card>
      <Card><Text style={text.h2}>Вес, кг</Text><View style={{ height: 10 }} /><LineChart points={[...state.weights].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({ date: entry.date, value: entry.kg }))} goal={state.profile.goalWeight} unit="кг" /></Card>
      <Section>История веса</Section>
      {sorted.map((entry, index) => { const previous = sorted[index + 1]; const delta = previous ? entry.kg - previous.kg : null; return <Card key={entry.id}><View style={layout.between}><View><Text style={text.body}>{fmtLong(entry.date)}</Text>{delta != null ? <Text style={[text.muted, { marginTop: 3 }]}>{delta > 0 ? '+' : delta < 0 ? '−' : '±'}{kg(Math.abs(delta))} кг</Text> : null}</View><View style={layout.row}><Text style={text.h2}>{kg(entry.kg)} кг</Text><Pressable onPress={() => Alert.alert('Удалить запись?', undefined, [{ text: 'Отмена' }, { text: 'Удалить', style: 'destructive', onPress: () => actions.deleteWeight(entry.id) }])} style={styles.delete}><Ionicons name="trash-outline" size={18} color={colors.mute} /></Pressable></View></View></Card> })}
    </> : tab === 'log' ? <>
      <View style={styles.metricRow}><Metric label="Силовых" value={state.workouts.length} /><Metric label="Кардио" value={state.cardio.length} /><Metric label="Осанка" value={state.posture.length} /></View>
      <Section>Журнал</Section>
      {logs.length === 0 ? <Card><Text style={text.soft}>Завершённые тренировки и кардио появятся здесь.</Text></Card> : logs.map((entry) => entry.type === 'workout' ? <Card key={entry.log.id}><View style={layout.between}><View style={{ flex: 1 }}><Text style={text.h2}>{WORKOUTS[entry.log.workoutId].title}</Text><Text style={text.soft}>{fmtShort(entry.log.date)} · {fmtMinutes((entry.log.finishedAt - entry.log.startedAt) / 1000)} · {doneSets(entry.log)} подх.</Text><Text style={[text.muted, { marginTop: 4 }]}>Объём {volumeOf(entry.log)} кг · неделя {entry.log.week}</Text></View><Pressable onPress={() => Alert.alert('Удалить тренировку?', undefined, [{ text: 'Отмена' }, { text: 'Удалить', style: 'destructive', onPress: () => actions.deleteWorkout(entry.log.id) }])} style={styles.delete}><Ionicons name="trash-outline" size={18} color={colors.mute} /></Pressable></View></Card> : <Card key={entry.log.id}><View style={layout.between}><View><Text style={text.h2}>Кардио · {entry.log.minutes} мин</Text><Text style={text.soft}>{fmtShort(entry.log.date)} · неделя {entry.log.week}</Text></View><Ionicons name="heart-outline" size={24} color={colors.cardio} /></View></Card>)}
    </> : <LiftsTab state={state} />}
  </Screen>
}

function LiftsTab({ state }: { state: AppState }) {
  const exercises = STRENGTH_ORDER.map((exerciseId) => {
    const points = state.workouts.flatMap((log) => {
      const exercise = log.exercises.find((item) => item.exerciseId === exerciseId)
      const weights = exercise?.sets.filter((item) => item.done && item.weight != null).map((item) => item.weight as number) ?? []
      return weights.length ? [{ date: log.date, value: Math.max(...weights) }] : []
    }).sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))
    return { exerciseId, points, latest: points.at(-1)?.value }
  }).filter((item) => item.points.length)
  if (!exercises.length) return <Card><Text style={text.soft}>После завершённых силовых здесь появятся графики рабочих весов.</Text></Card>
  return <>{exercises.map(({ exerciseId, points, latest }) => <Card key={exerciseId}><View style={layout.between}><Text style={[text.h2, { flex: 1 }]}>{EXERCISES[exerciseId].short}</Text><Text style={text.accent}>{kg(latest!)} кг</Text></View><View style={{ height: 8 }} /><LineChart points={points} unit="кг" /></Card>)}</>
}
const styles = StyleSheet.create({ tabs: { backgroundColor: colors.card, padding: 4, borderRadius: 16, flexDirection: 'row' }, tab: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, tabOn: { backgroundColor: colors.elevated }, tabText: { color: colors.mute, fontWeight: '700' }, tabTextOn: { color: colors.text }, metricRow: { flexDirection: 'row', gap: 8 }, delete: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: 8 } })
