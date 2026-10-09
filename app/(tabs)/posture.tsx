import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComplexId, PostureExercise, PostureLog } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { isComplex, postureStreak, postureThisWeek } from '@/src/store/selectors'
import { plural, todayISO, WEEKDAYS_FULL, WEEKDAYS_SHORT, weekdayIdx } from '@/src/lib/date'
import { complexFor, POSTURE_MAP, POSTURE_PRINCIPLES, POSTURE_WARNING } from '@/src/data/posture'
import { BACK_EXERCISE_COUNT, BACK_LIBRARY, BACK_PER_WEEK, backDay, backMinutes } from '@/src/data/back'
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
  SectionTitle,
  Stat,
  Txt,
} from '@/src/native/ui'
import { colors, fonts, tint } from '@/src/native/theme'
import { tap } from '@/src/native/feedback'

const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1)

/** Открыть комплекс; day — набор другого дня недели (0 = Пн), step — с какого упражнения начать */
const start = (kind: ComplexId, step?: number, day?: number) =>
  router.push({
    pathname: '/posture-session',
    params: { kind, ...(step === undefined ? {} : { step: String(step) }), ...(day === undefined ? {} : { day: String(day) }) },
  })

export default function PostureScreen() {
  const logs = useStore((s) => s.posture)
  const today = todayISO()
  const daily = complexFor('daily', today)

  return (
    <Screen tabs>
      <Header title="Осанка" subtitle="Голова над плечами, ровная спина, свободный таз" />
      <View style={styles.stats}>
        <Stat label="Серия" value={postureStreak(logs, today)} color={colors.posture} />
        <Stat label="Вечер" value={`${postureThisWeek(logs, today, 'back')}/${BACK_PER_WEEK}`} />
        <Stat label="Осанка" value={`${postureThisWeek(logs, today)}/7`} />
      </View>

      <ComplexCard kind="back" logs={logs} today={today} />

      <SectionTitle>Вечер · план на неделю</SectionTitle>
      <WeekPlan today={today} />

      <Banner icon="warning-outline" title="Когда остановиться">
        {POSTURE_WARNING.text}
      </Banner>

      <SectionTitle>Днём · комплекс для осанки</SectionTitle>
      <ComplexCard kind="daily" logs={logs} today={today} />
      <Card style={{ padding: 6 }}>
        {daily.items.map((exercise, index) => (
          <ExerciseRow key={exercise.id} exercise={exercise} first={index === 0} onPress={() => start('daily', index)} />
        ))}
      </Card>

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
        <Chip color={colors.posture} icon={kind === 'daily' ? 'body' : 'moon'}>
          {kind === 'daily' ? 'днём · постоянный' : 'вечером · свой набор на день'}
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

function ExerciseRow({ exercise, first, onPress }: { exercise: PostureExercise; first: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.exercise, !first && styles.divider]}>
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
  )
}

/** Вечерний план: выбор дня недели, его набор и справка по задачам */
function WeekPlan({ today }: { today: string }) {
  const todayIdx = weekdayIdx(today)
  const [day, setDay] = useState(todayIdx)
  const items = backDay(day)
  const isToday = day === todayIdx
  return (
    <>
      <View style={styles.days}>
        {WEEKDAYS_SHORT.map((label, index) => {
          const on = index === day
          return (
            <Pressable
              key={label}
              onPress={() => {
                tap()
                setDay(index)
              }}
              accessibilityState={{ selected: on }}
              style={[styles.day, on && styles.dayOn]}
            >
              <Text style={[styles.dayText, on && { color: colors.bg }]}>{label}</Text>
              <View style={[styles.dayDot, index === todayIdx && { backgroundColor: on ? colors.bg : colors.posture }]} />
            </Pressable>
          )
        })}
      </View>
      <Card style={{ padding: 6 }}>
        <View style={styles.dayHead}>
          <Txt v="h2">{isToday ? 'Сегодня' : capitalize(WEEKDAYS_FULL[day])}</Txt>
          <Txt v="muted">
            ~{backMinutes(items)} мин · {items.length} упражнений
          </Txt>
        </View>
        {items.map((exercise, index) => (
          <ExerciseRow key={exercise.id} exercise={exercise} first={false} onPress={() => start('back', index, day)} />
        ))}
      </Card>
      {!isToday ? (
        <Button
          title={`Сделать набор на ${WEEKDAYS_FULL[day].replace(/а$/, 'у')}`}
          tone="secondary"
          icon="play"
          onPress={() => start('back', undefined, day)}
        />
      ) : null}
      <Collapsible
        title={`Как устроена неделя · ${BACK_EXERCISE_COUNT} ${plural(BACK_EXERCISE_COUNT, 'упражнение', 'упражнения', 'упражнений')}`}
      >
        <Txt v="soft">
          Каждый вечер — семь упражнений в одном порядке: разогреть позвоночник и таз, растянуть бёдра, включить корпус и ягодицы,
          поработать над шеей, раскрыть грудной отдел и лопатки, расслабиться. По дням меняются только сами упражнения внутри задач, а
          неделя повторяется. Шея — каждый день: глубокие мышцы шеи укрепляются только регулярной нагрузкой.
        </Txt>
        <View style={{ gap: 16, marginTop: 16 }}>
          {BACK_LIBRARY.map(({ slot, items: variants }, index) => (
            <View key={slot.id}>
              <Txt v="strong" color={colors.posture}>
                {index + 1}. {slot.title}
              </Txt>
              <Txt v="muted" style={{ marginBottom: 8 }}>
                {slot.why}
              </Txt>
              <View style={styles.library}>
                {variants.map((e) => (
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
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  thumb: { width: 80, aspectRatio: 4 / 3 },
  focus: { color: colors.posture, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  dayOn: { backgroundColor: colors.posture, borderColor: colors.posture },
  dayText: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 13 },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  library: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libraryItem: { width: '48%' },
  libraryName: { color: colors.soft, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
})
