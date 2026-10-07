import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComplexId } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { isComplex, postureStreak, postureThisWeek } from '@/src/store/selectors'
import { todayISO } from '@/src/lib/date'
import { BACK_COMPLEX, BACK_PER_WEEK, BACK_TOTAL_MIN, POSTURE, POSTURE_PRINCIPLES, POSTURE_TOTAL_MIN, POSTURE_WARNING } from '@/src/data/posture'
import { StaticIllustration } from '@/src/illustrations/ExerciseIllustration'
import { Button, Card, Header, ProgressBar, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function PostureScreen() {
  const logs = useStore((s) => s.posture)
  const today = todayISO()
  const streak = postureStreak(logs, today)
  const daily = logs.find((item) => item.date === today && isComplex(item, 'daily'))
  const back = logs.find((item) => item.date === today && isComplex(item, 'back'))
  const start = (kind: ComplexId, step?: number) => router.push({ pathname: '/posture-session', params: { kind, ...(step === undefined ? {} : { step: String(step) }) } })
  const block = (kind: ComplexId, title: string, subtitle: string, done: boolean, progress: number) => <Card><View style={layout.between}><View style={{ flex: 1 }}><Text style={text.h2}>{title}</Text><Text style={text.soft}>{subtitle}</Text></View><Ionicons name={done ? 'checkmark-circle' : 'body-outline'} size={28} color={colors.posture} /></View><View style={{ height: 13 }} /><ProgressBar value={progress} color={colors.posture} /><View style={{ height: 14 }} />{done ? <View style={styles.actions}><Button title="Ещё раз" tone="secondary" onPress={() => start(kind)} /><Button title="Снять отметку" tone="ghost" onPress={() => Alert.alert('Снять отметку?', undefined, [{ text: 'Отмена' }, { text: 'Снять', style: 'destructive', onPress: () => actions.unmarkPosture(today, kind) }])} /></View> : <Button title="Начать комплекс" onPress={() => start(kind)} tone="secondary" />}</Card>
  return <Screen>
    <Header title="Осанка" subtitle="Мобильность, сила и привычка держать тело" />
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.number}>{streak}</Text><Text style={text.muted}>дней подряд</Text></View><View style={styles.metric}><Text style={styles.number}>{postureThisWeek(logs, today)}</Text><Text style={text.muted}>из 7 за неделю</Text></View></View>
    {block('daily', 'Ежедневный комплекс', `${POSTURE_TOTAL_MIN} мин · ${POSTURE.length} упражнений`, !!daily, postureThisWeek(logs, today) / 7)}
    {block('back', 'Спина и таз', `~${BACK_TOTAL_MIN} мин · ${BACK_COMPLEX.length} упражнений`, !!back, postureThisWeek(logs, today, 'back') / BACK_PER_WEEK)}
    <Card style={styles.warning}><View style={layout.row}><Ionicons name="warning-outline" size={22} color={colors.warn} /><Text style={[text.h2, { marginLeft: 9 }]}>Когда остановиться</Text></View><Text style={[text.soft, { marginTop: 8 }]}>{POSTURE_WARNING.text}</Text></Card>
    <Section>Принципы</Section>
    <Card>{POSTURE_PRINCIPLES.map((item, index) => <View key={index} style={styles.principle}><View style={styles.dot} /><Text style={[text.soft, { flex: 1 }]}>{item}</Text></View>)}</Card>
    <Section>Ежедневный комплекс</Section>
    {POSTURE.map((exercise, index) => <Pressable key={exercise.id} onPress={() => start('daily', index)}><Card style={styles.exercise}><StaticIllustration id={exercise.illustration} style={styles.thumb} /><View style={{ flex: 1 }}><Text style={text.h2}>{exercise.num}. {exercise.name}</Text><Text style={[text.soft, { marginTop: 3 }]}>{exercise.dose}</Text><Text style={[text.muted, { marginTop: 5 }]} numberOfLines={2}>{exercise.effect}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.mute} /></Card></Pressable>)}
    <Section>Спина и таз</Section>
    {BACK_COMPLEX.map((exercise, index) => <Pressable key={exercise.id} onPress={() => start('back', index)}><Card style={styles.exercise}><StaticIllustration id={exercise.illustration} style={styles.thumb} /><View style={{ flex: 1 }}><Text style={text.h2}>{exercise.num}. {exercise.name}</Text><Text style={[text.soft, { marginTop: 3 }]}>{exercise.dose}</Text><Text style={[text.muted, { marginTop: 5 }]} numberOfLines={2}>{exercise.effect}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.mute} /></Card></Pressable>)}
  </Screen>
}
const styles = StyleSheet.create({ metrics: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, padding: 15, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }, number: { color: colors.posture, fontSize: 28, fontWeight: '800' }, actions: { flexDirection: 'row', justifyContent: 'center', gap: 5 }, warning: { borderColor: colors.warn + '55' }, principle: { flexDirection: 'row', gap: 10, paddingVertical: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.posture, marginTop: 7 }, exercise: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9 }, thumb: { width: 94, aspectRatio: 4 / 3 } })
