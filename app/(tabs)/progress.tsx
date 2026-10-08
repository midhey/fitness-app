import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { AppState, CardioLog, PostureLog, WorkoutLog } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { dayStatus, doneSets, latestWeight, volumeOf } from '@/src/store/selectors'
import { addDays, fmtLong, fmtMinutes, fmtShort, parseISO, todayISO } from '@/src/lib/date'
import { WORKOUTS } from '@/src/data/program'
import { EXERCISES, STRENGTH_ORDER } from '@/src/data/exercises'
import { COMPLEX_TITLES } from '@/src/data/posture'
import { LineChart, Sparkline } from '@/src/native/LineChart'
import { MonthCalendar } from '@/src/native/Activity'
import { Button, Card, Header, IconButton, ProgressBar, Screen, Segmented, SectionTitle, Stat, Txt } from '@/src/native/ui'
import { colors, fonts, tint } from '@/src/native/theme'

type Tab = 'weight' | 'log' | 'lifts'
type Period = '30' | '90' | 'all'
const kg = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',')
const FEELING = { easy: 'легко', ok: 'нормально', hard: 'тяжело' } as const

export default function ProgressScreen() {
  const state = useStore((s) => s)
  const [tab, setTab] = useState<Tab>('weight')
  return (
    <Screen tabs>
      <Header
        title="Прогресс"
        right={
          <IconButton
            icon="add"
            label="Записать вес"
            color={colors.accentInk}
            background={colors.accent}
            onPress={() => router.push('/weight')}
          />
        }
      />
      <Segmented<Tab>
        options={[
          { value: 'weight', label: 'Вес' },
          { value: 'log', label: 'Журнал' },
          { value: 'lifts', label: 'Рабочие веса' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'weight' ? <WeightTab state={state} /> : tab === 'log' ? <LogTab state={state} /> : <LiftsTab state={state} />}
    </Screen>
  )
}

// ---------- Вес ----------

function WeightTab({ state }: { state: AppState }) {
  const [period, setPeriod] = useState<Period>('90')
  const { profile } = state
  const current = latestWeight(state.weights)?.kg ?? profile.startWeight
  const sorted = useMemo(() => [...state.weights].sort((a, b) => a.date.localeCompare(b.date)), [state.weights])
  const from = period === 'all' ? '' : addDays(todayISO(), -Number(period))
  const points = sorted.filter((w) => w.date >= from).map((w) => ({ date: w.date, value: w.kg }))
  const history = [...sorted].reverse()
  const progress = (profile.startWeight - current) / Math.max(1, profile.startWeight - profile.goalWeight)
  const remove = (id: string) =>
    Alert.alert('Удалить запись?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => actions.deleteWeight(id) },
    ])
  return (
    <>
      <View style={styles.stats}>
        <Stat label="Сейчас" value={kg(current)} unit="кг" />
        <Stat
          label="С начала"
          value={`${current < profile.startWeight ? '−' : current > profile.startWeight ? '+' : '±'}${kg(Math.abs(current - profile.startWeight))}`}
          unit="кг"
          color={current < profile.startWeight ? colors.accent : current > profile.startWeight ? colors.warn : undefined}
        />
        <Stat label="До цели" value={kg(Math.max(0, current - profile.goalWeight))} unit="кг" />
      </View>
      <Card>
        <View style={styles.between}>
          <Txt v="h2">Динамика</Txt>
          <View style={styles.periods}>
            {(
              [
                ['30', 'мес'],
                ['90', '3 мес'],
                ['all', 'всё'],
              ] as [Period, string][]
            ).map(([value, label]) => (
              <Pressable key={value} onPress={() => setPeriod(value)} style={[styles.period, period === value && styles.periodOn]}>
                <Text style={[styles.periodText, period === value && { color: colors.text }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ height: 12 }} />
        <LineChart points={points} goal={profile.goalWeight} unit="кг" />
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={progress} />
          <View style={[styles.between, { marginTop: 6 }]}>
            <Txt v="muted">старт {kg(profile.startWeight)} кг</Txt>
            <Txt v="muted">цель {kg(profile.goalWeight)} кг</Txt>
          </View>
        </View>
      </Card>
      <SectionTitle>История</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {history.map((entry, index) => {
          const previous = history[index + 1]
          const delta = previous ? entry.kg - previous.kg : null
          return (
            <View key={entry.id} style={[styles.historyRow, index > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Txt v="strong">{fmtLong(entry.date)}</Txt>
                {delta != null ? (
                  <Txt v="muted" color={delta < 0 ? colors.accent : delta > 0 ? colors.warn : colors.mute}>
                    {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
                    {kg(Math.abs(delta))} кг
                  </Txt>
                ) : null}
              </View>
              <Text style={styles.historyValue}>{kg(entry.kg)}</Text>
              <Pressable onPress={() => remove(entry.id)} accessibilityLabel="Удалить запись" hitSlop={8} style={styles.delete}>
                <Ionicons name="trash-outline" size={17} color={colors.mute} />
              </Pressable>
            </View>
          )
        })}
      </Card>
    </>
  )
}

// ---------- Журнал ----------

type Entry =
  | { type: 'workout'; date: string; time: number; log: WorkoutLog }
  | { type: 'cardio'; date: string; time: number; log: CardioLog }
  | { type: 'posture'; date: string; time: number; log: PostureLog }

function LogTab({ state }: { state: AppState }) {
  const today = todayISO()
  const [month, setMonth] = useState(() => ({ year: parseISO(today).getFullYear(), month: parseISO(today).getMonth() }))
  const [selected, setSelected] = useState<string | null>(today)
  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const status = selected ? dayStatus(state, selected) : null
  const dayEntries: Entry[] = status
    ? [
        ...status.strength.map((log) => ({ type: 'workout' as const, date: log.date, time: log.finishedAt, log })),
        ...status.cardio.map((log) => ({ type: 'cardio' as const, date: log.date, time: log.finishedAt, log })),
        ...[status.posture, status.back]
          .filter((p): p is PostureLog => !!p)
          .map((log) => ({ type: 'posture' as const, date: log.date, time: log.completedAt, log })),
      ].sort((a, b) => a.time - b.time)
    : []
  const monthPrefix = `${month.year}-${String(month.month + 1).padStart(2, '0')}`
  const inMonth = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date.startsWith(monthPrefix)).length

  return (
    <>
      <View style={styles.stats}>
        <Stat label="Силовых" value={inMonth(state.workouts)} color={colors.accent} />
        <Stat label="Кардио" value={inMonth(state.cardio)} color={colors.cardio} />
        <Stat label="Осанка" value={inMonth(state.posture)} color={colors.posture} />
      </View>
      <Card>
        <MonthCalendar
          state={state}
          year={month.year}
          month={month.month}
          today={today}
          selected={selected}
          onSelect={(iso) => setSelected(iso === selected ? null : iso)}
          onMonth={shift}
        />
      </Card>
      {selected ? (
        <>
          <SectionTitle>{fmtLong(selected)}</SectionTitle>
          {dayEntries.length ? (
            dayEntries.map((entry) => <EntryCard key={`${entry.type}-${entry.time}`} entry={entry} />)
          ) : (
            <Card>
              <Txt v="soft" style={{ textAlign: 'center' }}>
                В этот день занятий нет
              </Txt>
            </Card>
          )}
        </>
      ) : null}
    </>
  )
}

function EntryCard({ entry }: { entry: Entry }) {
  if (entry.type === 'workout') {
    const log = entry.log
    return (
      <Card>
        <View style={styles.entryHead}>
          <View style={[styles.entryIcon, { backgroundColor: tint(colors.accent, 0.12) }]}>
            <Ionicons name="barbell" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="strong">{WORKOUTS[log.workoutId].title}</Txt>
            <Txt v="muted">
              {fmtMinutes((log.finishedAt - log.startedAt) / 1000)} · {doneSets(log)} подх. · {volumeOf(log).toLocaleString('ru-RU')} кг
              {log.feeling ? ` · ${FEELING[log.feeling]}` : ''}
            </Txt>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('Удалить тренировку?', undefined, [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => actions.deleteWorkout(log.id) },
              ])
            }
            accessibilityLabel="Удалить тренировку"
            hitSlop={8}
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={17} color={colors.mute} />
          </Pressable>
        </View>
        <View style={styles.entrySets}>
          {log.exercises
            .filter((e) => e.sets.some((s) => s.done))
            .map((e, i) => (
              <View key={e.exerciseId + i} style={styles.entrySetRow}>
                <Txt v="soft" numberOfLines={1} style={{ flex: 1 }}>
                  {EXERCISES[e.exerciseId]?.short ?? e.exerciseId}
                </Txt>
                <Txt v="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {e.sets
                    .filter((s) => s.done)
                    .map((s) => (s.weight ? `${kg(s.weight)}×${s.reps ?? '—'}` : `${s.reps ?? '—'}`))
                    .join(' · ')}
                </Txt>
              </View>
            ))}
        </View>
        {log.note ? (
          <Txt v="soft" style={styles.entryNote}>
            «{log.note}»
          </Txt>
        ) : null}
      </Card>
    )
  }
  if (entry.type === 'cardio') {
    const log = entry.log
    return (
      <Card>
        <View style={styles.entryHead}>
          <View style={[styles.entryIcon, { backgroundColor: tint(colors.cardio, 0.12) }]}>
            <Ionicons name="heart" size={18} color={colors.cardio} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="strong">Кардио · {log.minutes} мин</Txt>
            <Txt v="muted">
              цель {log.targetMin} мин{log.feeling ? ` · ${FEELING[log.feeling]}` : ''}
            </Txt>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('Удалить кардио?', undefined, [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Удалить', style: 'destructive', onPress: () => actions.deleteCardio(log.id) },
              ])
            }
            accessibilityLabel="Удалить кардио"
            hitSlop={8}
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={17} color={colors.mute} />
          </Pressable>
        </View>
      </Card>
    )
  }
  const log = entry.log
  return (
    <Card>
      <View style={styles.entryHead}>
        <View style={[styles.entryIcon, { backgroundColor: tint(colors.posture, 0.12) }]}>
          <Ionicons name="body" size={18} color={colors.posture} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="strong">{COMPLEX_TITLES[log.complex ?? 'daily']}</Txt>
          <Txt v="muted">
            {log.steps} из {log.total} упражнений
          </Txt>
        </View>
      </View>
    </Card>
  )
}

// ---------- Рабочие веса ----------

function LiftsTab({ state }: { state: AppState }) {
  const [open, setOpen] = useState<string | null>(null)
  const exercises = useMemo(
    () =>
      STRENGTH_ORDER.map((exerciseId) => {
        const points = state.workouts
          .flatMap((log) => {
            const exercise = log.exercises.find((item) => item.exerciseId === exerciseId)
            const weights = exercise?.sets.filter((s) => s.done && s.weight != null).map((s) => s.weight as number) ?? []
            return weights.length ? [{ date: log.date, value: Math.max(...weights) }] : []
          })
          .sort((a, b) => a.date.localeCompare(b.date))
        return { exerciseId, points }
      }).filter((item) => item.points.length),
    [state.workouts],
  )
  if (!exercises.length)
    return (
      <Card style={styles.emptyCard}>
        <Ionicons name="trending-up" size={34} color={colors.mute} />
        <Txt v="soft" style={{ textAlign: 'center' }}>
          После первых силовых здесь появятся графики рабочих весов по каждому упражнению.
        </Txt>
        <Button title="К плану" tone="secondary" onPress={() => router.push('/plan')} />
      </Card>
    )
  return (
    <>
      {exercises.map(({ exerciseId, points }) => {
        const last = points[points.length - 1]
        const first = points[0]
        const best = Math.max(...points.map((p) => p.value))
        const gain = last.value - first.value
        const expanded = open === exerciseId
        return (
          <Card key={exerciseId} onPress={() => setOpen(expanded ? null : exerciseId)}>
            <View style={styles.between}>
              <View style={{ flex: 1 }}>
                <Txt v="strong" numberOfLines={1}>
                  {EXERCISES[exerciseId].short}
                </Txt>
                <Txt v="muted">
                  {fmtShort(last.date)} · лучший {kg(best)} кг
                  {gain > 0 ? ` · +${kg(gain)} кг` : ''}
                </Txt>
              </View>
              {!expanded ? <Sparkline points={points} width={84} height={36} /> : null}
              <Text style={styles.liftValue}>{kg(last.value)}</Text>
            </View>
            {expanded ? (
              <View style={{ marginTop: 12 }}>
                <LineChart points={points} unit="кг" height={170} />
              </View>
            ) : null}
          </Card>
        )
      })}
    </>
  )
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stats: { flexDirection: 'row', gap: 8 },
  periods: { flexDirection: 'row', backgroundColor: colors.elevated, borderRadius: 12, padding: 3 },
  period: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  periodOn: { backgroundColor: colors.raised },
  periodText: { color: colors.mute, fontFamily: fonts.semibold, fontSize: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  historyValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, fontVariant: ['tabular-nums'] },
  delete: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  entrySets: { marginTop: 12, gap: 6 },
  entrySetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryNote: { marginTop: 10, fontStyle: 'italic' },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  liftValue: {
    color: colors.accent,
    fontFamily: fonts.bold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },
})
