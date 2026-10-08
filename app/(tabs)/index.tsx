import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { AppState, ComplexId, WorkoutId } from '@/src/types'
import { useStore } from '@/src/store/store'
import { dayStatus, latestWeight, postureStreak, postureThisWeek, programWeek, rawWeek, weeklyPace } from '@/src/store/selectors'
import { addDays, fmtDayMonth, fmtShort, mondayOf, todayISO, WEEKDAYS_FULL, WEEKDAYS_SHORT, weekdayIdx } from '@/src/lib/date'
import { repsFor, repsLabel, SCHEDULE, setsFor, TOTAL_WEEKS, weekPlan, WORKOUTS } from '@/src/data/program'
import { EXERCISES } from '@/src/data/exercises'
import { complexFor } from '@/src/data/posture'
import { BACK_PER_WEEK } from '@/src/data/back'
import { Banner, Button, Card, Chip, Header, HeroCard, IconButton, ProgressBar, Ring, Screen, SectionTitle, Txt } from '@/src/native/ui'
import { WeekStrip } from '@/src/native/Activity'
import { Sparkline } from '@/src/native/LineChart'
import { StorageBanner } from '@/src/native/StorageBanner'
import { openWorkout } from '@/src/native/startWorkout'
import { colors, fonts, tint } from '@/src/native/theme'

const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1)
const kg = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',')

export default function HomeScreen() {
  const state = useStore((s) => s)
  const today = todayISO()
  const week = programWeek(state.profile, today)
  const finished = rawWeek(state.profile, today) > TOTAL_WEEKS
  const plan = weekPlan(week)

  return (
    <Screen tabs>
      <Header
        eyebrow={finished ? 'Программа завершена' : `Неделя ${week} из ${TOTAL_WEEKS} · ${plan.phase}`}
        title="Сегодня"
        subtitle={`${capitalize(WEEKDAYS_FULL[weekdayIdx(today)])}, ${fmtDayMonth(today)}`}
        right={<IconButton icon="person-circle-outline" label="Профиль и настройки" onPress={() => router.push('/profile')} />}
      />
      <StorageBanner />
      {finished ? (
        <Banner
          icon="trophy-outline"
          color={colors.accent}
          title="8 недель позади"
          action={
            <Button
              title="Начать новый цикл"
              size="sm"
              tone="secondary"
              onPress={() => router.push('/profile')}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            />
          }
        >
          Выбери неделю программы в профиле, чтобы пройти цикл заново с новыми весами.
        </Banner>
      ) : null}
      <WeekStrip state={state} today={today} />
      <TodayHero state={state} today={today} week={week} />

      <SectionTitle>Комплексы</SectionTitle>
      <View style={styles.tiles}>
        <ComplexTile state={state} today={today} kind="daily" />
        <ComplexTile state={state} today={today} kind="back" />
      </View>

      <SectionTitle action={{ label: 'Весь план', onPress: () => router.push('/plan') }}>Силовые этой недели</SectionTitle>
      <WeekWorkouts state={state} today={today} week={week} />

      <SectionTitle action={{ label: 'История', onPress: () => router.push('/progress') }}>Вес</SectionTitle>
      <WeightCard state={state} today={today} />
    </Screen>
  )
}

// ---------- Главное действие дня ----------

function TodayHero({ state, today, week }: { state: AppState; today: string; week: number }) {
  const todayPlan = SCHEDULE[weekdayIdx(today)]
  const status = dayStatus(state, today)

  if (state.active) {
    const workout = WORKOUTS[state.active.workoutId]
    const sets = state.active.exercises.flatMap((e) => e.sets)
    const done = sets.filter((s) => s.done).length
    return (
      <HeroCard>
        <Chip color={colors.accent} icon="flash">
          Идёт тренировка
        </Chip>
        <Txt v="h1" style={{ marginTop: 12 }}>
          {workout.title}
        </Txt>
        <Txt v="soft">{workout.focus}</Txt>
        <View style={styles.heroProgress}>
          <ProgressBar value={done / sets.length} />
          <Txt v="muted" style={{ marginTop: 6 }}>
            {done} из {sets.length} подходов
          </Txt>
        </View>
        <Button title="Продолжить" size="lg" iconRight="arrow-forward" onPress={() => router.push('/workout')} />
      </HeroCard>
    )
  }

  if (todayPlan.kind === 'strength' && todayPlan.workoutId) {
    const workout = WORKOUTS[todayPlan.workoutId]
    const log = status.strength.find((l) => l.workoutId === todayPlan.workoutId) ?? status.strength[0]
    if (log)
      return (
        <HeroCard>
          <View style={styles.heroDone}>
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={30} color={colors.accentInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="h1">Тренировка сделана</Txt>
              <Txt v="soft">{WORKOUTS[log.workoutId].title} · отличная работа</Txt>
            </View>
          </View>
          {!status.posture ? (
            <Button
              title="Добавить осанку · 10 мин"
              tone="secondary"
              icon="body-outline"
              onPress={() => router.push({ pathname: '/posture-session', params: { kind: 'daily' } })}
              style={{ marginTop: 16 }}
            />
          ) : null}
        </HeroCard>
      )
    return (
      <HeroCard>
        <View style={styles.between}>
          <Chip color={colors.accent} icon="barbell">
            Силовая {todayPlan.workoutId}
          </Chip>
          <Txt v="muted">{workout.minutes}</Txt>
        </View>
        <Txt v="h1" style={{ marginTop: 12 }}>
          {workout.focus}
        </Txt>
        <Txt v="soft" numberOfLines={2} style={{ marginTop: 4 }}>
          {workout.items.map((item) => EXERCISES[item.exerciseId].short).join(' · ')}
        </Txt>
        <Button
          title="Начать тренировку"
          size="lg"
          icon="play"
          onPress={() => openWorkout(todayPlan.workoutId!, week, today)}
          style={{ marginTop: 18 }}
        />
      </HeroCard>
    )
  }

  if (todayPlan.kind === 'cardio') {
    const done = status.cardio[0]
    return (
      <HeroCard color={colors.cardio}>
        <View style={styles.between}>
          <Chip color={colors.cardio} icon="heart">
            Кардио
          </Chip>
          <Txt v="muted">разговорный темп</Txt>
        </View>
        <Txt v="h1" style={{ marginTop: 12 }}>
          {done ? `Степпер · ${done.minutes} мин ✓` : `Степпер · ${weekPlan(week).cardioMin} мин`}
        </Txt>
        <Txt v="soft" style={{ marginTop: 4 }}>
          {done ? 'Кардио на сегодня выполнено.' : 'Умеренная интенсивность: дыхание учащённое, но можно говорить фразами.'}
        </Txt>
        {!done ? (
          <Button
            title="Открыть таймер"
            size="lg"
            icon="play"
            color={colors.cardio}
            onPress={() => router.push('/cardio')}
            style={{ marginTop: 18 }}
          />
        ) : null}
      </HeroCard>
    )
  }

  // День отдыха: предложить пропущенную силовую этой недели или осанку
  const missed = SCHEDULE.filter((d) => d.workoutId && d.weekday < weekdayIdx(today)).find(
    (d) => !state.workouts.some((w) => w.workoutId === d.workoutId && w.date >= mondayOf(today)),
  )
  return (
    <HeroCard color={colors.posture}>
      <Chip color={colors.posture} icon="moon">
        День отдыха
      </Chip>
      <Txt v="h1" style={{ marginTop: 12 }}>
        {todayPlan.note}
      </Txt>
      <Txt v="soft" style={{ marginTop: 4 }}>
        {missed
          ? `${WORKOUTS[missed.workoutId!].title} на этой неделе пропущена — можно сделать сегодня.`
          : 'Восстановление — часть программы. Комплекс для осанки займёт 10 минут.'}
      </Txt>
      <View style={{ gap: 8, marginTop: 18 }}>
        {!status.posture ? (
          <Button
            title="Комплекс для осанки"
            size="lg"
            icon="body"
            color={colors.posture}
            onPress={() => router.push({ pathname: '/posture-session', params: { kind: 'daily' } })}
          />
        ) : null}
        {missed ? (
          <Button
            title={`Наверстать: ${WORKOUTS[missed.workoutId!].title}`}
            tone="secondary"
            icon="barbell-outline"
            onPress={() => openWorkout(missed.workoutId!, week, today)}
          />
        ) : null}
      </View>
    </HeroCard>
  )
}

// ---------- Комплексы ----------

function ComplexTile({ state, today, kind }: { state: AppState; today: string; kind: ComplexId }) {
  const complex = complexFor(kind, today)
  const doneToday = state.posture.some((p) => p.date === today && (p.complex ?? 'daily') === kind)
  const thisWeek = postureThisWeek(state.posture, today, kind)
  const target = kind === 'daily' ? 7 : BACK_PER_WEEK
  const streak = kind === 'daily' ? postureStreak(state.posture, today) : 0
  return (
    <Card
      style={styles.tile}
      tone={doneToday ? colors.posture : undefined}
      onPress={() => router.push({ pathname: '/posture-session', params: { kind } })}
    >
      <View style={styles.between}>
        <Ring value={thisWeek / target} size={46} stroke={5} color={colors.posture}>
          <Ionicons name={doneToday ? 'checkmark' : kind === 'daily' ? 'body' : 'accessibility'} size={18} color={colors.posture} />
        </Ring>
        <Text style={styles.tileCount}>
          {thisWeek}/{target}
        </Text>
      </View>
      <Txt v="strong" style={{ marginTop: 12 }} numberOfLines={1}>
        {kind === 'daily' ? 'Осанка' : 'Спина и таз'}
      </Txt>
      <Txt v="muted" numberOfLines={1}>
        {doneToday ? 'сегодня ✓' : `~${complex.minutes} мин`}
        {streak > 1 ? ` · серия ${streak}` : ''}
      </Txt>
    </Card>
  )
}

// ---------- Силовые недели ----------

function WeekWorkouts({ state, today, week }: { state: AppState; today: string; week: number }) {
  const [open, setOpen] = useState<WorkoutId | null>(null)
  const monday = mondayOf(today)
  const todayId = SCHEDULE[weekdayIdx(today)].workoutId
  return (
    <Card style={{ padding: 6 }}>
      {(['A', 'B', 'C'] as WorkoutId[]).map((id, index) => {
        const workout = WORKOUTS[id]
        const day = SCHEDULE.find((d) => d.workoutId === id)!
        const done = state.workouts.find((w) => w.workoutId === id && w.date >= monday && w.date <= addDays(monday, 6))
        const isOpen = open === id
        const isToday = todayId === id && !done
        return (
          <View key={id} style={[index > 0 && styles.rowDivider]}>
            <View style={styles.workoutRow}>
              <Pressable onPress={() => setOpen(isOpen ? null : id)} style={styles.workoutMain} accessibilityState={{ expanded: isOpen }}>
                <View
                  style={[
                    styles.badge,
                    done && { backgroundColor: colors.accent },
                    isToday && { borderColor: colors.accent, borderWidth: 1.5 },
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={20} color={colors.accentInk} /> : <Text style={styles.badgeText}>{id}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Txt v="strong">{workout.title}</Txt>
                    {isToday ? <Chip color={colors.accent}>сегодня</Chip> : null}
                  </View>
                  <Txt v="muted" numberOfLines={1}>
                    {WEEKDAYS_SHORT[day.weekday]} · {workout.focus}
                  </Txt>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mute} />
              </Pressable>
              {done ? (
                <Txt v="muted" color={colors.accent} style={{ fontFamily: fonts.semibold }}>
                  {fmtShort(done.date)}
                </Txt>
              ) : (
                <Pressable onPress={() => openWorkout(id, week, today)} accessibilityLabel={`Начать ${workout.title}`} style={styles.play}>
                  <Ionicons name="play" size={16} color={colors.accentInk} />
                </Pressable>
              )}
            </View>
            {isOpen ? (
              <View style={styles.exerciseList}>
                {workout.items.map((item, i) => (
                  <Pressable
                    key={item.exerciseId + i}
                    onPress={() => router.push({ pathname: '/exercise', params: { id: item.exerciseId, week: String(week) } })}
                    style={styles.exerciseRow}
                  >
                    <Text style={styles.exerciseIndex}>{i + 1}</Text>
                    <Txt style={{ flex: 1 }} numberOfLines={1}>
                      {EXERCISES[item.exerciseId].short}
                    </Txt>
                    <Txt v="soft" style={{ fontVariant: ['tabular-nums'] }}>
                      {setsFor(item, i, week)} × {repsLabel(repsFor(item, week))}
                      {EXERCISES[item.exerciseId].perSide ? '/стор.' : ''}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )
      })}
    </Card>
  )
}

// ---------- Вес ----------

function WeightCard({ state, today }: { state: AppState; today: string }) {
  const { profile } = state
  const current = latestWeight(state.weights)?.kg ?? profile.startWeight
  const lost = profile.startWeight - current
  const progress = lost / Math.max(1, profile.startWeight - profile.goalWeight)
  const remaining = Math.max(0, current - profile.goalWeight)
  const pace = weeklyPace(state.weights, today)
  const points = [...state.weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((w) => ({ date: w.date, value: w.kg }))
  return (
    <Card>
      <View style={styles.between}>
        <View>
          <Txt v="muted">Сейчас</Txt>
          <Text style={styles.weight}>
            {kg(current)}
            <Text style={styles.weightUnit}> кг</Text>
          </Text>
          <Txt v="soft" color={lost > 0 ? colors.accent : lost < 0 ? colors.warn : colors.soft}>
            {lost > 0 ? '−' : lost < 0 ? '+' : '±'}
            {kg(Math.abs(lost))} кг с начала
          </Txt>
        </View>
        <Sparkline points={points} width={128} height={56} />
      </View>
      <View style={{ marginTop: 16 }}>
        <ProgressBar value={progress} />
        <View style={[styles.between, { marginTop: 8 }]}>
          <Txt v="muted">{remaining ? `до цели ${kg(remaining)} кг` : 'цель достигнута 🎉'}</Txt>
          <Txt v="muted">{pace == null ? 'темп появится позже' : `${pace > 0 ? '+' : '−'}${kg(Math.abs(pace))} кг/нед`}</Txt>
        </View>
      </View>
      <Button title="Записать вес" tone="secondary" icon="add" onPress={() => router.push('/weight')} style={{ marginTop: 14 }} />
    </Card>
  )
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroProgress: { marginVertical: 16 },
  heroDone: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  doneBadge: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 14 },
  tileCount: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  workoutMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: tint(colors.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 18 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  exerciseList: { paddingHorizontal: 14, paddingBottom: 8 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  exerciseIndex: { width: 18, color: colors.mute, fontFamily: fonts.medium, fontSize: 12, fontVariant: ['tabular-nums'] },
  weight: { color: colors.text, fontFamily: fonts.bold, fontSize: 40, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  weightUnit: { color: colors.mute, fontFamily: fonts.medium, fontSize: 16, letterSpacing: 0 },
})
