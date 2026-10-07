import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Feeling } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { programWeek } from '@/src/store/selectors'
import { todayISO } from '@/src/lib/date'
import { CARDIO_RULES, STEPPER_TECHNIQUE, weekPlan } from '@/src/data/program'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { Button, Card, Header, ProgressBar, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'
import { signal } from '@/src/native/feedback'

const format = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const TIMER_KEY = 'homefit.cardioTimer'
export default function CardioScreen() {
  const profile = useStore((s) => s.profile)
  const week = programWeek(profile, todayISO())
  const target = weekPlan(week).cardioMin * 60
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [feeling, setFeeling] = useState<Feeling>('ok')
  const [loaded, setLoaded] = useState(false)
  const startedAt = useRef(0)
  const base = useRef(0)
  const targetSignaled = useRef(false)
  useEffect(() => { AsyncStorage.getItem(TIMER_KEY).then((raw) => { if (!raw) return; const saved = JSON.parse(raw) as { elapsed: number; running: boolean; savedAt: number }; const restored = saved.elapsed + (saved.running ? Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000)) : 0); base.current = restored; setElapsed(restored); setRunning(saved.running) }).catch(() => {}).finally(() => setLoaded(true)) }, [])
  useEffect(() => { if (!running) return; startedAt.current = Date.now(); const timer = setInterval(() => setElapsed(base.current + Math.floor((Date.now() - startedAt.current) / 1000)), 1000); return () => clearInterval(timer) }, [running])
  useEffect(() => { if (!loaded) return; AsyncStorage.setItem(TIMER_KEY, JSON.stringify({ elapsed, running, savedAt: Date.now() })).catch(() => {}) }, [elapsed, running, loaded])
  useEffect(() => { if (elapsed >= target && !targetSignaled.current) { targetSignaled.current = true; signal('done') } }, [elapsed, target])
  const toggle = () => { if (running) base.current = elapsed; setRunning(!running); Haptics.selectionAsync() }
  const finish = () => Alert.alert('Сохранить кардио?', `${Math.max(1, Math.round(elapsed / 60))} мин`, [{ text: 'Отмена' }, { text: 'Сохранить', onPress: () => { actions.addCardio({ date: todayISO(), week, minutes: Math.max(1, Math.round(elapsed / 60)), targetMin: target / 60, feeling, finishedAt: Date.now() }); AsyncStorage.removeItem(TIMER_KEY); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back() } }])
  return <Screen>
    <Header title="Кардио" subtitle={`Неделя ${week} · степпер`} />
    <ExerciseIllustration id="stepper" />
    <Card style={styles.timer}><Text style={styles.time}>{format(elapsed)}</Text><Text style={text.soft}>цель {target / 60} минут · разговорный темп</Text><View style={{ width: '100%', marginTop: 20 }}><ProgressBar value={elapsed / target} color={colors.cardio} /></View><View style={styles.timerButtons}><Button title={running ? 'Пауза' : elapsed ? 'Продолжить' : 'Старт'} onPress={toggle} tone="secondary" icon={<Ionicons name={running ? 'pause' : 'play'} size={20} color={colors.text} />} /><Button title="Завершить" onPress={finish} disabled={elapsed < 30} /></View></Card>
    <Section>Ощущения</Section><View style={styles.feelings}>{([['easy','Легко'],['ok','Умеренно'],['hard','Тяжело']] as [Feeling,string][]).map(([value,label]) => <Button key={value} compact title={label} tone={feeling === value ? 'accent' : 'ghost'} onPress={() => setFeeling(value)} />)}</View>
    <Section>Техника</Section><Card>{STEPPER_TECHNIQUE.map((item, index) => <View key={index} style={styles.rule}><Ionicons name="checkmark-circle-outline" size={18} color={colors.cardio} /><Text style={[text.soft, { flex: 1 }]}>{item}</Text></View>)}</Card>
    <Section>Правила</Section><Card>{CARDIO_RULES.map((item, index) => <View key={index} style={styles.rule}><View style={styles.dot} /><Text style={[text.soft, { flex: 1 }]}>{item}</Text></View>)}</Card>
  </Screen>
}
const styles = StyleSheet.create({ timer: { alignItems: 'center', paddingVertical: 28 }, time: { color: colors.text, fontSize: 58, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -2 }, timerButtons: { flexDirection: 'row', gap: 10, marginTop: 20 }, feelings: { flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.card, padding: 4, borderRadius: 17 }, rule: { flexDirection: 'row', gap: 10, paddingVertical: 7 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cardio, marginTop: 7 } })
