import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ActiveSession, DraftSet, Feeling, WorkoutLog } from '@/src/types'
import { actions, lastLogFor, useStore } from '@/src/store/store'
import { loadFactor } from '@/src/store/selectors'
import { fmtClock, fmtMinutes, fmtShort } from '@/src/lib/date'
import { EXERCISES } from '@/src/data/exercises'
import { repsFor, repsLabel, WARMUP, weekPlan, WORKOUTS } from '@/src/data/program'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import {
  Banner,
  Button,
  Card,
  Chip,
  Collapsible,
  IconButton,
  NumberedSteps,
  ProgressBar,
  Screen,
  Segmented,
  Stat,
  Txt,
} from '@/src/native/ui'
import { colors, fonts, radius, tint } from '@/src/native/theme'
import { signal, success, tap, useScreenAwake } from '@/src/native/feedback'

const fmtKg = (value: number) => String(value).replace('.', ',')

export default function WorkoutScreen() {
  useScreenAwake()
  const active = useStore((s) => s.active)
  const workouts = useStore((s) => s.workouts)

  if (!active)
    return (
      <Screen>
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={44} color={colors.mute} />
          <Txt v="h2">Активной тренировки нет</Txt>
          <Button title="На главную" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    )

  const count = active.exercises.length
  const current = Math.min(Math.max(active.current, -1), count)
  const go = (index: number) => {
    tap()
    actions.setCurrent(index)
  }
  const discard = () =>
    Alert.alert('Удалить тренировку?', 'Отмеченные подходы не сохранятся.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          actions.discardWorkout()
          router.replace('/')
        },
      },
    ])

  const footer = (
    <View style={{ gap: 10 }}>
      {active.rest ? <RestBar rest={active.rest} /> : null}
      {current < count ? (
        <View style={styles.nav}>
          <IconButton
            icon="chevron-back"
            label="Предыдущий шаг"
            size={56}
            background={colors.elevated}
            color={colors.text}
            onPress={() => current > -1 && go(current - 1)}
          />
          <Button
            title={
              current === -1
                ? 'К первому упражнению'
                : current === count - 1
                  ? 'К завершению'
                  : `Дальше: ${EXERCISES[active.exercises[current + 1].exerciseId].short}`
            }
            size="lg"
            iconRight="arrow-forward"
            tone={current === -1 || active.exercises[current].sets.every((s) => s.done) ? 'accent' : 'secondary'}
            onPress={() => go(current + 1)}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  )

  return (
    <Screen footer={current < count || active.rest ? footer : undefined}>
      <View style={styles.top}>
        <IconButton icon="chevron-down" label="Свернуть тренировку" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt v="h2">{WORKOUTS[active.workoutId].title}</Txt>
          <Elapsed startedAt={active.startedAt} week={active.week} />
        </View>
        <IconButton icon="trash-outline" label="Удалить тренировку" onPress={discard} />
      </View>
      <Steps active={active} current={current} onSelect={go} />
      {current === -1 ? (
        <Warmup active={active} />
      ) : current < count ? (
        <ExerciseStep key={current} active={active} index={current} workouts={workouts} />
      ) : (
        <Finish active={active} />
      )}
    </Screen>
  )
}

function Elapsed({ startedAt, week }: { startedAt: number; week: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <Txt v="muted" style={{ fontVariant: ['tabular-nums'] }}>
      Неделя {week} · {fmtClock((now - startedAt) / 1000)}
    </Txt>
  )
}

// ---------- Шаги ----------

function Steps({ active, current, onSelect }: { active: ActiveSession; current: number; onSelect: (index: number) => void }) {
  const scroll = useRef<ScrollView>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (current + 1) * 52 - 120), animated: true })
  }, [current])
  const warmupDone = active.warmup.every(Boolean)
  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
      <StepDot label="Разминка" icon="flame" on={current === -1} done={warmupDone} onPress={() => onSelect(-1)} />
      {active.exercises.map((exercise, index) => {
        const done = exercise.sets.filter((s) => s.done).length
        return (
          <StepDot
            key={index}
            label={String(index + 1)}
            on={current === index}
            done={done === exercise.sets.length}
            partial={done > 0 && done < exercise.sets.length}
            onPress={() => onSelect(index)}
          />
        )
      })}
      <StepDot label="Итог" icon="flag" on={current === active.exercises.length} onPress={() => onSelect(active.exercises.length)} />
    </ScrollView>
  )
}

function StepDot({
  label,
  icon,
  on,
  done,
  partial,
  onPress,
}: {
  label: string
  icon?: 'flame' | 'flag'
  on: boolean
  done?: boolean
  partial?: boolean
  onPress: () => void
}) {
  const wide = !!icon
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={wide ? label : `Упражнение ${label}`}
      accessibilityState={{ selected: on }}
      style={[styles.step, wide && styles.stepWide, done && styles.stepDone, partial && styles.stepPartial, on && styles.stepOn]}
    >
      {done && !on ? (
        <Ionicons name="checkmark" size={18} color={colors.accentInk} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={15} color={on ? colors.bg : colors.soft} /> : null}
          <Text style={[styles.stepText, on && { color: colors.bg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

// ---------- Разминка ----------

function Warmup({ active }: { active: ActiveSession }) {
  const done = active.warmup.filter(Boolean).length
  return (
    <>
      <View>
        <Txt v="label" color={colors.accent}>
          Перед тренировкой · 7–8 мин
        </Txt>
        <Txt v="title">Разминка</Txt>
      </View>
      <Card style={{ padding: 6 }}>
        {WARMUP.map((item, index) => {
          const on = active.warmup[index]
          return (
            <Pressable
              key={item}
              onPress={() => {
                tap()
                actions.updateActive((a) => ({ ...a, warmup: a.warmup.map((v, i) => (i === index ? !v : v)) }))
              }}
              style={[styles.check, index > 0 && styles.checkDivider]}
            >
              <View style={[styles.checkBox, on && styles.checkBoxOn]}>
                {on ? <Ionicons name="checkmark" size={16} color={colors.accentInk} /> : null}
              </View>
              <Txt v="body" color={on ? colors.mute : colors.text} style={[{ flex: 1 }, on && { textDecorationLine: 'line-through' }]}>
                {item}
              </Txt>
            </Pressable>
          )
        })}
      </Card>
      <ProgressBar value={done / WARMUP.length} />
      <Txt v="muted" style={{ textAlign: 'center' }}>
        Разминку можно пропустить, но с ней суставы и мышцы готовы к рабочим весам.
      </Txt>
    </>
  )
}

// ---------- Упражнение ----------

function ExerciseStep({ active, index, workouts }: { active: ActiveSession; index: number; workouts: WorkoutLog[] }) {
  const draft = active.exercises[index]
  const ex = EXERCISES[draft.exerciseId]
  const item = WORKOUTS[active.workoutId].items[index]
  const reps = repsFor(item, active.week)
  const plan = weekPlan(active.week)
  const note = ex.weekNotes?.[active.week]
  const weighted = ex.tracking !== 'bodyweight'
  const isLast = index === active.exercises.length - 1
  const last = useMemo(() => lastLogFor(workouts, draft.exerciseId), [workouts, draft.exerciseId])
  const lastDone = last?.sets ?? []
  const canAdd =
    weighted && lastDone.length >= 2 && lastDone.every((s) => (s.reps ?? 0) >= reps[1]) && plan.setsDelta === 0 && active.week !== 1
  const weightLabel = !weighted ? 'Вес' : ex.implement === 'pair' ? 'Гантель, кг' : ex.implement === 'barbell' ? 'Штанга, кг' : 'Вес, кг'

  // Вес предыдущего подхода в этой тренировке — самый вероятный вес следующего
  const prevDraftWeight = (k: number) => {
    for (let j = k - 1; j >= 0; j--) if (draft.sets[j].weight.trim()) return draft.sets[j].weight
    return null
  }
  const lastWeight = (k: number) => {
    const s = lastDone[Math.min(k, lastDone.length - 1)]
    return s?.weight != null ? fmtKg(s.weight) : null
  }
  const hintWeight = (k: number) => prevDraftWeight(k) ?? lastWeight(k) ?? (ex.tracking === 'optionalWeight' ? '0' : '')
  const hintReps = (k: number) => String(lastDone[Math.min(k, lastDone.length - 1)]?.reps ?? reps[0])

  const toggle = (k: number) => {
    const s = draft.sets[k]
    tap()
    if (s.done) return actions.setField(index, k, { done: false })
    const weight = s.weight.trim() || (weighted ? hintWeight(k) : '')
    const r = s.reps.trim() || hintReps(k)
    const allDoneAfter = draft.sets.every((x, j) => (j === k ? true : x.done))
    const next = active.exercises[index + 1]
    actions.updateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) =>
        i === index
          ? { ...e, sets: e.sets.map((x, j) => (j === k ? { ...x, done: true, weight: weight.replace('.', ','), reps: r } : x)) }
          : e,
      ),
      rest:
        allDoneAfter && isLast
          ? null
          : {
              endsAt: Date.now() + item.restSec * 1000,
              total: item.restSec,
              label: allDoneAfter ? `Дальше: ${EXERCISES[next.exerciseId].short}` : `${ex.short} · подход ${k + 2} из ${draft.sets.length}`,
            },
    }))
  }

  const swap = () => {
    if (draft.sets.some((s) => s.done)) return Alert.alert('Сначала сними отметки', 'Снаряд можно сменить, пока ни один подход не отмечен.')
    actions.swapExercise(index, ex.alt!)
  }

  return (
    <>
      <View>
        <Txt v="label" color={colors.accent}>
          Упражнение {index + 1} из {active.exercises.length}
        </Txt>
        <Txt v="title">{ex.name}</Txt>
        <View style={styles.chips}>
          <Chip color={colors.accent} icon="repeat">
            {draft.sets.length} × {repsLabel(reps)}
            {ex.perSide ? ' на сторону' : ''}
          </Chip>
          <Chip icon="timer-outline">отдых {item.restSec} с</Chip>
        </View>
      </View>

      {ex.alt ? (
        <Segmented
          options={[
            { value: 'dumbbell', label: 'Гантели' },
            { value: 'barbell', label: 'Штанга' },
          ]}
          value={ex.implement === 'barbell' ? 'barbell' : 'dumbbell'}
          onChange={(v) => {
            if ((v === 'barbell') !== (ex.implement === 'barbell')) swap()
          }}
        />
      ) : null}

      <Pressable onPress={() => router.push({ pathname: '/exercise', params: { id: ex.id, week: String(active.week) } })}>
        <ExerciseIllustration id={ex.id} compact />
        <View style={styles.techLink}>
          <Ionicons name="expand-outline" size={14} color={colors.soft} />
          <Text style={styles.techLinkText}>Техника полностью</Text>
        </View>
      </Pressable>

      {note ? (
        <Banner icon="trending-up" color={colors.accent} title={`Неделя ${active.week}`}>
          {note}
        </Banner>
      ) : null}

      {last ? (
        <Card style={styles.lastCard}>
          <View style={{ flex: 1 }}>
            <Txt v="muted">Прошлый раз · {fmtShort(last.log.date)}</Txt>
            <Txt v="strong" style={{ fontVariant: ['tabular-nums'], marginTop: 2 }}>
              {lastDone
                .map((s) => (s.weight != null && weighted ? `${fmtKg(s.weight)}×${s.reps ?? '—'}` : `${s.reps ?? '—'}`))
                .join('  ·  ')}
            </Txt>
          </View>
          {canAdd ? (
            <Chip color={colors.accent} icon="arrow-up">
              прибавь вес
            </Chip>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ paddingHorizontal: 12 }}>
        <View style={styles.setHead}>
          <Text style={[styles.setHeadText, { width: 30 }]}>№</Text>
          <Text style={[styles.setHeadText, { flex: 1 }]}>{weightLabel}</Text>
          <Text style={[styles.setHeadText, { flex: 1 }]}>Повторы</Text>
          <View style={{ width: 52 }} />
        </View>
        {draft.sets.map((s, k) => (
          <SetRow
            key={k}
            n={k + 1}
            set={s}
            weighted={weighted}
            weightHint={hintWeight(k) || '—'}
            repsHint={hintReps(k)}
            onWeight={(weight) => actions.setField(index, k, { weight })}
            onReps={(r) => actions.setField(index, k, { reps: r.replace(/\D/g, '') })}
            onToggle={() => toggle(k)}
          />
        ))}
        <View style={styles.setActions}>
          <Pressable
            onPress={() => actions.removeSet(index)}
            disabled={draft.sets.length <= 1}
            hitSlop={8}
            style={[styles.setAction, draft.sets.length <= 1 && { opacity: 0.35 }]}
          >
            <Ionicons name="remove" size={16} color={colors.soft} />
            <Text style={styles.setActionText}>подход</Text>
          </Pressable>
          <Pressable onPress={() => actions.addSet(index)} hitSlop={8} style={styles.setAction}>
            <Ionicons name="add" size={16} color={colors.soft} />
            <Text style={styles.setActionText}>подход</Text>
          </Pressable>
        </View>
      </Card>
      <Txt v="muted" style={{ textAlign: 'center', paddingHorizontal: 8 }}>
        Пустые поля при отметке заполнятся подсказкой — прошлым результатом или нижней границей. Галочка запускает отдых.
      </Txt>

      <Collapsible title="Как выполнять">
        <Txt v="soft" style={{ marginBottom: 12 }}>
          {ex.setup}
        </Txt>
        <NumberedSteps steps={ex.steps} />
      </Collapsible>
    </>
  )
}

function SetRow({
  n,
  set,
  weighted,
  weightHint,
  repsHint,
  onWeight,
  onReps,
  onToggle,
}: {
  n: number
  set: DraftSet
  weighted: boolean
  weightHint: string
  repsHint: string
  onWeight: (value: string) => void
  onReps: (value: string) => void
  onToggle: () => void
}) {
  return (
    <View style={[styles.setRow, set.done && styles.setRowDone]}>
      <Text style={[styles.setNumber, set.done && { color: colors.accent }]}>{n}</Text>
      <TextInput
        value={set.weight}
        onChangeText={onWeight}
        keyboardType="decimal-pad"
        placeholder={weighted ? weightHint : '—'}
        placeholderTextColor={colors.mute}
        editable={weighted}
        selectTextOnFocus
        style={[styles.input, !weighted && { opacity: 0.35 }, set.done && styles.inputDone]}
      />
      <TextInput
        value={set.reps}
        onChangeText={onReps}
        keyboardType="number-pad"
        placeholder={repsHint}
        placeholderTextColor={colors.mute}
        selectTextOnFocus
        style={[styles.input, set.done && styles.inputDone]}
      />
      <Pressable
        onPress={onToggle}
        accessibilityLabel={set.done ? `Подход ${n} выполнен, отменить` : `Отметить подход ${n}`}
        accessibilityState={{ checked: set.done }}
        style={({ pressed }) => [styles.tick, set.done && styles.tickOn, pressed && { transform: [{ scale: 0.92 }] }]}
      >
        <Ionicons name="checkmark" size={24} color={set.done ? colors.accentInk : colors.mute} />
      </Pressable>
    </View>
  )
}

// ---------- Отдых ----------

function RestBar({ rest }: { rest: NonNullable<ActiveSession['rest']> }) {
  const [now, setNow] = useState(Date.now())
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (left > 0) return
    actions.updateActive((a) => (a.rest?.endsAt === rest.endsAt ? { ...a, rest: null } : a))
    signal('done')
  }, [left, rest.endsAt])
  const extend = () => {
    tap()
    actions.updateActive((a) => (a.rest ? { ...a, rest: { ...a.rest, endsAt: a.rest.endsAt + 15000, total: a.rest.total + 15 } } : a))
  }
  const skip = () => {
    tap()
    actions.updateActive((a) => ({ ...a, rest: null }))
  }
  return (
    <View style={styles.rest}>
      <View style={{ flex: 1 }}>
        <View style={styles.restHead}>
          <Text style={styles.restTime}>{fmtClock(left)}</Text>
          <Txt v="muted" numberOfLines={1} style={{ flex: 1 }}>
            отдых · {rest.label}
          </Txt>
        </View>
        <ProgressBar value={1 - left / rest.total} height={6} />
      </View>
      <Pressable onPress={extend} accessibilityLabel="Добавить 15 секунд" style={styles.restButton}>
        <Text style={styles.restButtonText}>+15</Text>
      </Pressable>
      <Pressable onPress={skip} accessibilityLabel="Пропустить отдых" style={[styles.restButton, { backgroundColor: colors.accent }]}>
        <Ionicons name="play-skip-forward" size={18} color={colors.accentInk} />
      </Pressable>
    </View>
  )
}

// ---------- Завершение ----------

function Finish({ active }: { active: ActiveSession }) {
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [note, setNote] = useState('')
  const stats = useMemo(() => {
    let done = 0
    let total = 0
    let volume = 0
    for (const e of active.exercises)
      for (const s of e.sets) {
        total++
        if (!s.done) continue
        done++
        const w = Number(s.weight.replace(',', '.'))
        const r = Number(s.reps)
        if (w > 0 && r > 0) volume += w * r * loadFactor(e.exerciseId)
      }
    return { done, total, volume: Math.round(volume) }
  }, [active])
  const save = () => {
    actions.finishWorkout(feeling, note)
    success()
    router.replace('/')
  }
  return (
    <>
      <View>
        <Txt v="label" color={colors.accent}>
          Финиш
        </Txt>
        <Txt v="title">Как прошло?</Txt>
      </View>
      <View style={styles.stats}>
        <Stat label="Подходы" value={`${stats.done}/${stats.total}`} />
        <Stat label="Объём" value={stats.volume.toLocaleString('ru-RU')} unit="кг" />
        <Stat label="Время" value={fmtMinutes((Date.now() - active.startedAt) / 1000)} />
      </View>
      <Segmented<Feeling>
        options={[
          { value: 'easy', label: 'Легко', hint: 'запас > 3' },
          { value: 'ok', label: 'Нормально', hint: 'запас 2–3' },
          { value: 'hard', label: 'Тяжело', hint: 'запас 0–1' },
        ]}
        value={feeling}
        onChange={setFeeling}
      />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Заметка: самочувствие, что поменять в следующий раз"
        placeholderTextColor={colors.mute}
        multiline
        style={styles.note}
      />
      {stats.done === 0 ? (
        <Banner icon="information-circle-outline" title="Нет отмеченных подходов">
          Отметь хотя бы один подход, чтобы сохранить тренировку в журнал.
        </Banner>
      ) : null}
      <Button title="Сохранить тренировку" size="lg" icon="checkmark-done" disabled={stats.done === 0} onPress={save} />
    </>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 14, paddingTop: 120 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  steps: { gap: 8, paddingVertical: 4 },
  step: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepWide: { paddingHorizontal: 14 },
  stepDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepPartial: { borderColor: tint(colors.accent, 0.6) },
  stepOn: { backgroundColor: colors.text, borderColor: colors.text },
  stepText: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 14 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 10 },
  checkDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.mute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  techLink: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: tint(colors.bg, 0.7),
  },
  techLinkText: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 12 },
  lastCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  setHeadText: { color: colors.mute, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderRadius: radius.md },
  setRowDone: { backgroundColor: tint(colors.accent, 0.05) },
  setNumber: { width: 30, color: colors.soft, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    color: colors.text,
    textAlign: 'center',
    fontSize: 19,
    fontFamily: fonts.semibold,
    borderWidth: 1,
    borderColor: colors.line,
    fontVariant: ['tabular-nums'],
  },
  inputDone: { borderColor: tint(colors.accent, 0.3), color: colors.accent },
  tick: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tickOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  setActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  setAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8 },
  setActionText: { color: colors.soft, fontFamily: fonts.medium, fontSize: 13 },
  nav: { flexDirection: 'row', gap: 10 },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: tint(colors.accent, 0.35),
  },
  restHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  restTime: { color: colors.accent, fontFamily: fonts.bold, fontSize: 26, fontVariant: ['tabular-nums'] },
  restButton: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  restButtonText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  note: {
    minHeight: 96,
    borderRadius: radius.lg,
    padding: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
})
