import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '@/src/store/store'
import { programWeek } from '@/src/store/selectors'
import { todayISO, WEEKDAYS_SHORT, weekdayIdx } from '@/src/lib/date'
import { EXERCISES, STRENGTH_ORDER } from '@/src/data/exercises'
import { StaticIllustration } from '@/src/illustrations/ExerciseIllustration'
import { BARBELL_NOTES, repsFor, repsLabel, SAFETY, SCHEDULE, setsFor, TOTAL_WEEKS, WEEKS, WORKOUTS } from '@/src/data/program'
import type { WorkoutId } from '@/src/types'
import { Bullet, Button, Card, Chip, Collapsible, Header, HeroCard, Screen, SectionTitle, Txt } from '@/src/native/ui'
import { openWorkout } from '@/src/native/startWorkout'
import { colors, fonts, tint } from '@/src/native/theme'

export default function PlanScreen() {
  const profile = useStore((s) => s.profile)
  const today = todayISO()
  const current = programWeek(profile, today)
  const [week, setWeek] = useState(current)
  const [open, setOpen] = useState<WorkoutId | null>(null)
  const [showAll, setShowAll] = useState(false)
  const info = WEEKS[week - 1]
  const todayIndex = weekdayIdx(today)

  return (
    <Screen tabs>
      <Header title="План" subtitle="8 недель · 3 силовые · 2 кардио · осанка ежедневно" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeks}>
        {WEEKS.map((item) => {
          const on = item.n === week
          return (
            <Pressable
              key={item.n}
              onPress={() => setWeek(item.n)}
              accessibilityState={{ selected: on }}
              style={[styles.week, on && styles.weekOn]}
            >
              <Text style={[styles.weekSmall, on && { color: colors.accentInk }]}>НЕД</Text>
              <Text style={[styles.weekNumber, on && { color: colors.accentInk }]}>{item.n}</Text>
              <View style={[styles.weekDot, item.n === current && { backgroundColor: on ? colors.accentInk : colors.accent }]} />
            </Pressable>
          )
        })}
      </ScrollView>

      <HeroCard>
        <View style={styles.between}>
          <Txt v="label" color={colors.accent}>
            Неделя {week} из {TOTAL_WEEKS}
            {week === current ? ' · сейчас' : ''}
          </Txt>
        </View>
        <Txt v="h1" style={{ marginTop: 6 }}>
          {info.phase}
        </Txt>
        <Txt v="strong" color={colors.soft}>
          {info.summary}
        </Txt>
        <Txt v="soft" style={{ marginTop: 10 }}>
          {info.details}
        </Txt>
        <View style={styles.chips}>
          <Chip color={colors.accent} icon="battery-half">
            запас {info.rir} повт.
          </Chip>
          <Chip color={colors.cardio} icon="heart">
            кардио {info.cardioMin} мин
          </Chip>
          {info.setsDelta < 0 ? <Chip icon="remove-circle-outline">−1 подход</Chip> : null}
          {info.firstExerciseBonus ? <Chip icon="add-circle-outline">+1 подход в первом</Chip> : null}
        </View>
      </HeroCard>

      <SectionTitle>Расписание недели</SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        {SCHEDULE.map((day, index) => {
          const color = day.kind === 'strength' ? colors.accent : day.kind === 'cardio' ? colors.cardio : colors.mute
          const isToday = index === todayIndex
          return (
            <View key={day.weekday} style={[styles.schedule, index > 0 && styles.divider]}>
              <Text style={[styles.day, isToday && { color: colors.accent }]}>{WEEKDAYS_SHORT[day.weekday]}</Text>
              <View style={[styles.scheduleIcon, { backgroundColor: tint(color, 0.12) }]}>
                <Ionicons name={day.kind === 'strength' ? 'barbell' : day.kind === 'cardio' ? 'heart' : 'moon'} color={color} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="strong">{day.title}</Txt>
                <Txt v="muted">{day.note}</Txt>
              </View>
              {isToday ? <Chip color={colors.accent}>сегодня</Chip> : null}
            </View>
          )
        })}
      </Card>

      <SectionTitle>Силовые тренировки</SectionTitle>
      {(['A', 'B', 'C'] as WorkoutId[]).map((id) => {
        const workout = WORKOUTS[id]
        const expanded = open === id
        return (
          <Card key={id} style={{ padding: 0 }}>
            <Pressable onPress={() => setOpen(expanded ? null : id)} style={styles.workoutHead} accessibilityState={{ expanded }}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="h2">{workout.title}</Txt>
                <Txt v="muted">
                  {workout.focus} · {workout.items.length} упр. · {workout.minutes}
                </Txt>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mute} />
            </Pressable>
            {expanded ? (
              <View style={styles.workoutBody}>
                {workout.items.map((item, index) => (
                  <Pressable
                    key={item.exerciseId + index}
                    onPress={() => router.push({ pathname: '/exercise', params: { id: item.exerciseId, week: String(week) } })}
                    style={styles.exercise}
                  >
                    <StaticIllustration id={item.exerciseId} style={styles.thumb} />
                    <View style={{ flex: 1 }}>
                      <Txt v="strong" numberOfLines={2}>
                        {EXERCISES[item.exerciseId].name}
                      </Txt>
                      <Txt v="muted" style={{ fontVariant: ['tabular-nums'] }}>
                        {setsFor(item, index, week)} × {repsLabel(repsFor(item, week))} · отдых {item.restSec} с
                      </Txt>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mute} />
                  </Pressable>
                ))}
                <Button
                  title={`Начать ${workout.title}`}
                  icon="play"
                  onPress={() => openWorkout(id, week, today)}
                  style={{ marginTop: 6 }}
                />
              </View>
            ) : null}
          </Card>
        )
      })}

      <SectionTitle action={{ label: showAll ? 'Скрыть' : `Показать · ${STRENGTH_ORDER.length}`, onPress: () => setShowAll((v) => !v) }}>
        Все упражнения
      </SectionTitle>
      {showAll ? (
        <View style={styles.grid}>
          {STRENGTH_ORDER.map((exerciseId) => (
            <Pressable
              key={exerciseId}
              onPress={() => router.push({ pathname: '/exercise', params: { id: exerciseId, week: String(week) } })}
              style={({ pressed }) => [styles.exerciseCard, pressed && { opacity: 0.75 }]}
            >
              <StaticIllustration id={exerciseId} />
              <Text style={styles.exerciseName} numberOfLines={2}>
                {EXERCISES[exerciseId].short}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Collapsible title="Гантели или штанга">
        <View style={{ gap: 10 }}>
          {BARBELL_NOTES.map((item, index) => (
            <Bullet key={index}>{item}</Bullet>
          ))}
        </View>
      </Collapsible>
      <Collapsible title="Безопасность">
        <View style={{ gap: 10 }}>
          {SAFETY.map((item, index) => (
            <Bullet key={index} icon="shield-checkmark-outline" color={colors.warn}>
              {item}
            </Bullet>
          ))}
        </View>
      </Collapsible>
    </Screen>
  )
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weeks: { gap: 8, paddingVertical: 2 },
  week: {
    width: 56,
    height: 66,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  weekOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  weekSmall: { color: colors.mute, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 0.6 },
  weekNumber: { color: colors.text, fontFamily: fonts.bold, fontSize: 21 },
  weekDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  schedule: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  day: { width: 24, color: colors.mute, fontFamily: fonts.semibold, fontSize: 13 },
  scheduleIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  workoutHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  workoutBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: tint(colors.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 20 },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  thumb: { width: 84, aspectRatio: 4 / 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exerciseCard: {
    width: '48.5%',
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  exerciseName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, padding: 12 },
})
