import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComplexId, PostureLog } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { isComplex, postureStreak, postureThisWeek } from '@/src/store/selectors'
import { addDays, todayISO } from '@/src/lib/date'
import { complexFor, POSTURE_MAP, POSTURE_PRINCIPLES, POSTURE_WARNING } from '@/src/data/posture'
import { BACK_EXERCISE_COUNT, BACK_LIBRARY, BACK_PER_WEEK, backComplexFor } from '@/src/data/back'
import { StaticIllustration } from '@/src/illustrations/ExerciseIllustration'
import {
  Banner,
  Bullet,
  Button,
  Card,
  Chip,
  Collapsible,
  Header,
  HeroCard,
  ProgressBar,
  Screen,
  Segmented,
  SectionTitle,
  Stat,
  Txt,
} from '@/src/native/ui'
import { colors, fonts, tint } from '@/src/native/theme'

const start = (kind: ComplexId, step?: number) =>
  router.push({ pathname: '/posture-session', params: step === undefined ? { kind } : { kind, step: String(step) } })

export default function PostureScreen() {
  const logs = useStore((s) => s.posture)
  const today = todayISO()
  const [list, setList] = useState<ComplexId>('back')
  const complex = complexFor(list, today)

  return (
    <Screen tabs>
      <Header title="Осанка" subtitle="Мобильность, сила и привычка держать тело" />
      <View style={styles.stats}>
        <Stat label="Серия" value={postureStreak(logs, today)} color={colors.posture} />
        <Stat label="Осанка" value={`${postureThisWeek(logs, today)}/7`} />
        <Stat label="Спина и таз" value={`${postureThisWeek(logs, today, 'back')}/${BACK_PER_WEEK}`} />
      </View>

      <ComplexCard kind="back" logs={logs} today={today} />
      <ComplexCard kind="daily" logs={logs} today={today} />

      <Banner icon="warning-outline" title="Когда остановиться">
        {POSTURE_WARNING.text}
      </Banner>

      <SectionTitle>Упражнения на сегодня</SectionTitle>
      <Segmented<ComplexId>
        options={[
          { value: 'back', label: 'Спина и таз' },
          { value: 'daily', label: 'Осанка' },
        ]}
        value={list}
        onChange={setList}
        color={colors.posture}
      />
      <Card style={{ padding: 6 }}>
        {complex.items.map((exercise, index) => (
          <Pressable key={exercise.id} onPress={() => start(list, index)} style={[styles.exercise, index > 0 && styles.divider]}>
            <StaticIllustration id={exercise.illustration} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              {exercise.focus ? <Text style={styles.focus}>{exercise.focus}</Text> : null}
              <Txt v="strong" numberOfLines={2}>
                {exercise.num}. {exercise.name}
              </Txt>
              <Txt v="muted" numberOfLines={1}>
                {exercise.dose}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mute} />
          </Pressable>
        ))}
      </Card>

      {list === 'back' ? <BackRotation today={today} /> : null}

      <Collapsible title="Принципы">
        <View style={{ gap: 10 }}>
          {POSTURE_PRINCIPLES.map((item, index) => (
            <Bullet key={index} color={colors.posture}>
              {item}
            </Bullet>
          ))}
        </View>
      </Collapsible>
      <Collapsible title="Что на что работает">
        <View style={{ gap: 12 }}>
          {POSTURE_MAP.map((item) => (
            <View key={item.area}>
              <Txt v="strong" color={colors.posture}>
                {item.area}
              </Txt>
              <Txt v="soft">{item.items}</Txt>
            </View>
          ))}
        </View>
      </Collapsible>
    </Screen>
  )
}

function ComplexCard({ kind, logs, today }: { kind: ComplexId; logs: PostureLog[]; today: string }) {
  const complex = complexFor(kind, today)
  const target = kind === 'daily' ? 7 : BACK_PER_WEEK
  const done = logs.find((item) => item.date === today && isComplex(item, kind))
  const week = postureThisWeek(logs, today, kind)
  const unmark = () =>
    Alert.alert('Снять отметку за сегодня?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Снять', style: 'destructive', onPress: () => actions.unmarkPosture(today, kind) },
    ])
  return (
    <HeroCard color={colors.posture}>
      <View style={styles.between}>
        <Chip color={colors.posture} icon={kind === 'daily' ? 'body' : 'shuffle'}>
          {kind === 'daily' ? 'ежедневно · постоянный' : 'ежедневно · новый набор'}
        </Chip>
        {done ? (
          <View style={styles.done}>
            <Ionicons name="checkmark" size={14} color={colors.bg} />
            <Text style={styles.doneText}>сегодня</Text>
          </View>
        ) : null}
      </View>
      <Txt v="h1" style={{ marginTop: 12 }}>
        {complex.title}
      </Txt>
      <Txt v="soft">
        ~{complex.minutes} мин · {complex.items.length} упражнений
        {done && done.steps < done.total ? ` · сделано ${done.steps} из ${done.total}` : ''}
      </Txt>
      {kind === 'back' ? (
        <View style={styles.focusList}>
          {complex.items.map((e, index) => (
            <View key={e.id} style={[styles.focusRow, index > 0 && styles.focusDivider]}>
              <Text style={styles.focusTitle}>{e.focus}</Text>
              <Text style={styles.focusName} numberOfLines={2}>
                {e.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ marginVertical: 14 }}>
        <ProgressBar value={week / target} color={colors.posture} />
        <Txt v="muted" style={{ marginTop: 6 }}>
          На этой неделе: {week} из {target}
        </Txt>
      </View>
      {done ? (
        <View style={styles.actions}>
          <Button title="Ещё раз" tone="secondary" icon="refresh" onPress={() => start(kind)} style={{ flex: 1 }} />
          <Button title="Снять отметку" tone="ghost" onPress={unmark} />
        </View>
      ) : (
        <Button title="Начать комплекс" size="lg" icon="play" color={colors.posture} onPress={() => start(kind)} />
      )}
    </HeroCard>
  )
}

/** Как устроена ротация: завтрашний набор и все варианты по задачам */
function BackRotation({ today }: { today: string }) {
  const tomorrow = backComplexFor(addDays(today, 1))
  return (
    <>
      <Card>
        <View style={styles.between}>
          <Txt v="h2">Завтра</Txt>
          <Txt v="muted">~{Math.round(tomorrow.reduce((s, e) => s + e.minutes, 0))} мин</Txt>
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          {tomorrow.map((e) => (
            <View key={e.id} style={styles.tomorrowRow}>
              <Text style={styles.tomorrowFocus}>{e.focus}</Text>
              <Txt v="soft" style={{ flex: 1 }} numberOfLines={1}>
                {e.name}
              </Txt>
            </View>
          ))}
        </View>
      </Card>
      <Collapsible title={`Как меняется комплекс · ${BACK_EXERCISE_COUNT} упражнений`}>
        <Txt v="soft">
          Порядок задач каждый день один и тот же: разогреть позвоночник, растянуть бёдра, включить корпус и ягодицы, раскрыть грудной отдел
          и закончить расслаблением. Меняется только упражнение внутри задачи — нагрузка разнообразная, но всегда сбалансированная. Одно и
          то же упражнение два дня подряд не повторяется, а сгибатели бедра попадают в набор чаще других: при прогибе в пояснице они важнее
          остальных растяжек.
        </Txt>
        <View style={{ gap: 16, marginTop: 16 }}>
          {BACK_LIBRARY.map(({ slot, items }, index) => (
            <View key={slot.id}>
              <Txt v="strong" color={colors.posture}>
                {index + 1}. {slot.title}
              </Txt>
              <Txt v="muted" style={{ marginBottom: 8 }}>
                {slot.why}
              </Txt>
              <View style={styles.library}>
                {items.map((e) => (
                  <View key={e.id} style={styles.libraryItem}>
                    <StaticIllustration id={e.illustration} />
                    <Text style={styles.libraryName} numberOfLines={2}>
                      {e.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </Collapsible>
    </>
  )
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', gap: 8 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.posture,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  doneText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  focusList: {
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: tint(colors.posture, 0.07),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tint(colors.posture, 0.22),
  },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  focusDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tint(colors.posture, 0.18) },
  focusTitle: { width: 98, color: colors.posture, fontFamily: fonts.semibold, fontSize: 12 },
  focusName: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  thumb: { width: 80, aspectRatio: 4 / 3 },
  focus: { color: colors.posture, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  tomorrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tomorrowFocus: { width: 104, color: colors.mute, fontFamily: fonts.medium, fontSize: 12 },
  library: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libraryItem: { width: '48%' },
  libraryName: { color: colors.soft, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
})
