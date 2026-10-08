import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Feeling } from '@/src/types'
import { actions, useStore } from '@/src/store/store'
import { programWeek } from '@/src/store/selectors'
import { fmtClock, todayISO } from '@/src/lib/date'
import { CARDIO_RULES, STEPPER_TECHNIQUE, weekPlan } from '@/src/data/program'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { Banner, Bullet, Button, Collapsible, Header, IconButton, Ring, Screen, Segmented, SectionTitle, Txt } from '@/src/native/ui'
import { colors, fonts } from '@/src/native/theme'
import { signal, success, useScreenAwake } from '@/src/native/feedback'

const TIMER_KEY = 'homefit.cardioTimer'
/** Таймер, который идёт дольше, скорее всего забыли остановить */
const STALE_SEC = 3 * 3600

/** Время хранится как накопленное + момент старта: запись только при старте, паузе и сбросе */
interface TimerState {
  accumulated: number
  startedAt: number | null
}

function parseTimer(raw: string | null): TimerState {
  if (!raw) return { accumulated: 0, startedAt: null }
  const saved = JSON.parse(raw) as Partial<TimerState> & { elapsed?: number; running?: boolean; savedAt?: number }
  // Формат до 2.1: { elapsed, running, savedAt }
  if (saved.elapsed != null) return { accumulated: saved.elapsed, startedAt: saved.running ? (saved.savedAt ?? Date.now()) : null }
  return { accumulated: saved.accumulated ?? 0, startedAt: saved.startedAt ?? null }
}

const elapsedOf = (t: TimerState, now: number) => t.accumulated + (t.startedAt ? Math.max(0, (now - t.startedAt) / 1000) : 0)

export default function CardioScreen() {
  useScreenAwake()
  const profile = useStore((s) => s.profile)
  const week = programWeek(profile, todayISO())
  const target = weekPlan(week).cardioMin * 60
  const [timer, setTimer] = useState<TimerState>({ accumulated: 0, startedAt: null })
  const [now, setNow] = useState(Date.now())
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [signaled, setSignaled] = useState(false)
  const running = timer.startedAt !== null
  const elapsed = Math.floor(elapsedOf(timer, now))

  useEffect(() => {
    AsyncStorage.getItem(TIMER_KEY)
      .then((raw) => {
        const restored = parseTimer(raw)
        setTimer(restored)
        setSignaled(elapsedOf(restored, Date.now()) >= target)
      })
      .catch(() => {})
  }, [target])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    if (elapsed >= target && !signaled) {
      setSignaled(true)
      signal('done')
    }
  }, [elapsed, target, signaled])

  const save = (next: TimerState | null) => {
    if (next) setTimer(next)
    ;(next ? AsyncStorage.setItem(TIMER_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(TIMER_KEY)).catch(() => {})
  }
  const toggle = () => {
    const t = Date.now()
    setNow(t)
    save(running ? { accumulated: elapsedOf(timer, t), startedAt: null } : { accumulated: timer.accumulated, startedAt: t })
  }
  const reset = () =>
    Alert.alert('Сбросить таймер?', 'Время этого занятия не сохранится.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: () => {
          save({ accumulated: 0, startedAt: null })
          setSignaled(false)
        },
      },
    ])
  const finish = () => {
    const minutes = Math.max(1, Math.round(elapsed / 60))
    Alert.alert('Сохранить кардио?', `${minutes} мин на степпере`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сохранить',
        onPress: () => {
          actions.addCardio({ date: todayISO(), week, minutes, targetMin: target / 60, feeling, finishedAt: Date.now() })
          save(null)
          success()
          router.back()
        },
      },
    ])
  }

  return (
    <Screen>
      <Header title="Кардио" subtitle={`Неделя ${week} · степпер · цель ${target / 60} мин`} onBack={() => router.back()} />
      {elapsed > STALE_SEC ? (
        <Banner icon="time-outline" title="Таймер идёт больше трёх часов">
          Похоже, его забыли остановить. Сбрось таймер, чтобы начать занятие заново.
        </Banner>
      ) : null}
      <View style={styles.timer}>
        <Ring value={elapsed / target} size={260} stroke={14} color={colors.cardio}>
          <Text style={styles.time}>{fmtClock(elapsed)}</Text>
          <Txt v="muted">из {fmtClock(target)}</Txt>
          {elapsed >= target ? (
            <Txt v="strong" color={colors.cardio} style={{ marginTop: 6 }}>
              цель достигнута
            </Txt>
          ) : null}
        </Ring>
      </View>
      <View style={styles.controls}>
        <IconButton icon="refresh" label="Сбросить таймер" size={56} background={colors.elevated} onPress={reset} />
        <Button
          title={running ? 'Пауза' : elapsed ? 'Продолжить' : 'Старт'}
          size="lg"
          icon={running ? 'pause' : 'play'}
          color={colors.cardio}
          tone={running ? 'secondary' : 'accent'}
          onPress={toggle}
          style={{ flex: 1 }}
        />
        <IconButton
          icon="checkmark"
          label="Завершить и сохранить"
          size={56}
          background={elapsed >= 30 ? colors.cardio : colors.elevated}
          color={elapsed >= 30 ? colors.bg : colors.mute}
          onPress={() => (elapsed >= 30 ? finish() : Alert.alert('Слишком коротко', 'Сохранить можно после 30 секунд.'))}
        />
      </View>
      <Txt v="muted" style={{ textAlign: 'center' }}>
        Интенсивность 5–6 из 10: дыхание учащённое, но можно говорить фразами
      </Txt>

      <SectionTitle>Ощущения</SectionTitle>
      <Segmented<Feeling>
        options={[
          { value: 'easy', label: 'Легко' },
          { value: 'ok', label: 'Умеренно' },
          { value: 'hard', label: 'Тяжело' },
        ]}
        value={feeling}
        onChange={setFeeling}
        color={colors.cardio}
      />

      <Collapsible title="Техника на степпере">
        <ExerciseIllustration id="stepper" />
        <View style={{ gap: 10, marginTop: 14 }}>
          {STEPPER_TECHNIQUE.map((item, index) => (
            <Bullet key={index} icon="checkmark-circle-outline" color={colors.cardio}>
              {item}
            </Bullet>
          ))}
        </View>
      </Collapsible>
      <Collapsible title="Правила кардио">
        <View style={{ gap: 10 }}>
          {CARDIO_RULES.map((item, index) => (
            <Bullet key={index} color={colors.cardio}>
              {item}
            </Bullet>
          ))}
        </View>
      </Collapsible>
    </Screen>
  )
}

const styles = StyleSheet.create({
  timer: { alignItems: 'center', paddingVertical: 12 },
  time: { color: colors.text, fontFamily: fonts.bold, fontSize: 60, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})
